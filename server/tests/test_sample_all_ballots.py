import io
import uuid, json
from typing import List
import pytest
from flask.testing import FlaskClient

from .helpers import *  # pylint: disable=wildcard-import
from ..models import *  # pylint: disable=wildcard-import
from ..bgcompute import bgcompute_update_ballot_manifest_file


@pytest.fixture
def contest_ids(
    client: FlaskClient, election_id: str, jurisdiction_ids: List[str]
) -> List[str]:
    contests = [
        {
            "id": str(uuid.uuid4()),
            "name": "Contest 1",
            "isTargeted": True,
            "choices": [
                {"id": str(uuid.uuid4()), "name": "candidate 1", "numVotes": 1000000,},
                {"id": str(uuid.uuid4()), "name": "candidate 2", "numVotes": 999000,},
                {"id": str(uuid.uuid4()), "name": "candidate 3", "numVotes": 1000,},
            ],
            "totalBallotsCast": 2000000,
            "numWinners": 1,
            "votesAllowed": 1,
            "jurisdictionIds": jurisdiction_ids[:2],
        },
    ]
    rv = put_json(client, f"/api/election/{election_id}/contest", contests)
    assert_ok(rv)
    return [str(c["id"]) for c in contests]


@pytest.fixture
def manifests(client: FlaskClient, election_id: str, jurisdiction_ids: List[str]):
    set_logged_in_user(client, UserType.JURISDICTION_ADMIN, DEFAULT_JA_EMAIL)
    rv = client.put(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/ballot-manifest",
        data={
            "manifest": (
                io.BytesIO(
                    b"Batch Name,Number of Ballots\n"
                    b"1,200000\n"
                    b"2,200000\n"
                    b"3,200000\n"
                    b"4,200000\n"
                    b"5,200000"
                ),
                "manifest.csv",
            )
        },
    )
    assert_ok(rv)
    rv = client.put(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/ballot-manifest",
        data={
            "manifest": (
                io.BytesIO(
                    b"Batch Name,Number of Ballots\n"
                    b"1,200000\n"
                    b"2,200000\n"
                    b"3,200000\n"
                    b"4,200000\n"
                    b"5,200000"
                ),
                "manifest.csv",
            )
        },
    )
    assert_ok(rv)
    bgcompute_update_ballot_manifest_file()


def test_all_ballots_sample_size(
    client: FlaskClient,
    election_id: str,
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    sample_size_options = json.loads(rv.data)["sampleSizes"]
    options = sample_size_options[contest_ids[0]]
    # We only expect the all-ballots sample size option when the margin is
    # small and the number of ballots is large
    assert options == [{"key": "all-ballots", "size": 2000000, "prob": None}]


def test_all_ballots_audit(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    snapshot,
):
    contest_id = contest_ids[0]

    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)

    rv = client.get(f"/api/election/{election_id}/settings")
    assert json.loads(rv.data)["online"] is True

    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    sample_sizes = json.loads(rv.data)["sampleSizes"]
    selected_sample_sizes = {contest_id: sample_sizes[contest_id][0]["size"]}

    rv = post_json(
        client,
        f"/api/election/{election_id}/round",
        {"roundNum": 1, "sampleSizes": selected_sample_sizes},
    )
    assert_ok(rv)

    rv = client.get(f"/api/election/{election_id}/round")
    round_1 = json.loads(rv.data)["rounds"][0]
    round_id = round_1["id"]

    compare_json(
        round_1,
        {
            "id": assert_is_id,
            "roundNum": 1,
            "startedAt": assert_is_date,
            "endedAt": None,
            "isAuditComplete": None,
            "sampledAllBallots": True,
        },
    )

    # Election should have been converted to offline automatically
    rv = client.get(f"/api/election/{election_id}/settings")
    assert json.loads(rv.data)["online"] is False

    # No ballots actually got sampled (i.e. written to the db)
    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/round/{round_id}/ballots"
    )
    assert json.loads(rv.data) == {"ballots": []}

    # Create audit boards and record results for one jurisdiction
    set_logged_in_user(client, UserType.JURISDICTION_ADMIN, DEFAULT_JA_EMAIL)

    rv = post_json(
        client,
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/round/{round_id}/audit-board",
        [{"name": "Audit Board #1"}, {"name": "Audit Board #2"}],
    )

    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/contest"
    )
    contest = json.loads(rv.data)["contests"][0]

    # TODO test trying to record more results than were in the manifest
    jurisdiction_1_results = {
        contest["id"]: {
            choice["id"]: choice["numVotes"] / 2 for choice in contest["choices"]
        },
    }

    rv = put_json(
        client,
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/round/{round_id}/results",
        jurisdiction_1_results,
    )
    assert_ok(rv)

    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[0]}/round/{round_id}/results",
    )
    assert rv.status_code == 200
    assert json.loads(rv.data) == jurisdiction_1_results

    # Round shouldn't be over yet, since we haven't recorded results for all jurisdictions with sampled ballots
    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/round"
    )
    rounds = json.loads(rv.data)["rounds"]
    assert rounds[0]["endedAt"] is None

    # Now do the second jurisdiction
    rv = post_json(
        client,
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/round/{round_id}/audit-board",
        [{"name": "Audit Board #1"}],
    )

    jurisdiction_2_results = {
        contest["id"]: {
            choice["id"]: choice["numVotes"] / 2 for choice in contest["choices"]
        },
    }

    rv = put_json(
        client,
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/round/{round_id}/results",
        jurisdiction_2_results,
    )
    assert_ok(rv)

    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/round/{round_id}/results",
    )
    assert rv.status_code == 200
    assert json.loads(rv.data) == jurisdiction_1_results

    # Round should be over
    rv = client.get(
        f"/api/election/{election_id}/jurisdiction/{jurisdiction_ids[1]}/round"
    )
    rounds = json.loads(rv.data)["rounds"]
    assert rounds[0]["endedAt"] is not None

    snapshot.assert_match(
        {
            f"{result.contest.name} - {result.contest_choice.name}": result.result
            for result in RoundContestResult.query.filter_by(round_id=round_id).all()
        }
    )

    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/report")
    assert_match_report(rv.data, snapshot)
