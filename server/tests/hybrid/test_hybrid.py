import json
from ...models import *  # pylint: disable=wildcard-import
from ..helpers import *  # pylint: disable=wildcard-import
from ..ballot_comparison.test_ballot_comparison import (
    audit_all_ballots,
    check_discrepancies,
    generate_audit_results,
)


def test_contest_vote_counts_before_cvrs(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/contest")
    contests = json.loads(rv.data)["contests"]
    # Returns None for numVotesCvr/NonCvr before CVRs are uploaded
    compare_json(
        contests[0]["choices"],
        [
            {
                "id": assert_is_id,
                "name": "Choice 1-1",
                "numVotes": 12 + 18,  # CVR + non-CVR
                "numVotesCvr": None,
                "numVotesNonCvr": None,
            },
            {
                "id": assert_is_id,
                "name": "Choice 1-2",
                "numVotes": 8 + 2,
                "numVotesCvr": None,
                "numVotesNonCvr": None,
            },
        ],
    )
    compare_json(
        contests[1]["choices"],
        [
            {
                "id": assert_is_id,
                "name": "Choice 2-1",
                "numVotes": 13 + 7,
                "numVotesCvr": None,
                "numVotesNonCvr": None,
            },
            {
                "id": assert_is_id,
                "name": "Choice 2-2",
                "numVotes": 6 + 2,
                "numVotesCvr": None,
                "numVotesNonCvr": None,
            },
            {
                "id": assert_is_id,
                "name": "Choice 2-3",
                "numVotes": 7 + 3,
                "numVotesCvr": None,
                "numVotesNonCvr": None,
            },
        ],
    )


def test_contest_vote_counts(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    cvrs,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/contest")
    contests = json.loads(rv.data)["contests"]
    compare_json(
        contests[0]["choices"],
        [
            {
                "id": assert_is_id,
                "name": "Choice 1-1",
                "numVotes": 12 + 18,  # CVR + non-CVR
                "numVotesCvr": 12,
                "numVotesNonCvr": 18,
            },
            {
                "id": assert_is_id,
                "name": "Choice 1-2",
                "numVotes": 8 + 2,
                "numVotesCvr": 8,
                "numVotesNonCvr": 2,
            },
        ],
    )
    compare_json(
        contests[1]["choices"],
        [
            {
                "id": assert_is_id,
                "name": "Choice 2-1",
                "numVotes": 13 + 7,
                "numVotesCvr": 13,
                "numVotesNonCvr": 7,
            },
            {
                "id": assert_is_id,
                "name": "Choice 2-2",
                "numVotes": 6 + 2,
                "numVotesCvr": 6,
                "numVotesNonCvr": 2,
            },
            {
                "id": assert_is_id,
                "name": "Choice 2-3",
                "numVotes": 7 + 3,
                "numVotesCvr": 7,
                "numVotesNonCvr": 3,
            },
        ],
    )


def test_sample_size(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    cvrs,  # pylint: disable=unused-argument
    snapshot,
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    sample_sizes = json.loads(rv.data)["sampleSizes"]
    assert len(sample_sizes) == 1
    snapshot.assert_match(sample_sizes[contest_ids[0]])


def test_sample_size_before_manifest(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    assert rv.status_code == 409
    assert json.loads(rv.data) == {
        "errors": [
            {
                "errorType": "Conflict",
                "message": "Some jurisdictions haven't uploaded their manifests yet",
            }
        ]
    }


def test_sample_size_before_cvrs(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    assert rv.status_code == 409
    assert json.loads(rv.data) == {
        "errors": [
            {
                "errorType": "Conflict",
                "message": "Some jurisdictions haven't uploaded their CVRs yet.",
            }
        ]
    }


def test_contest_names_dont_match_cvrs(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    cvrs,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    contests = [
        {
            "id": str(uuid.uuid4()),
            "name": "Bad Contest Name",
            "isTargeted": True,
            "choices": [
                {"id": str(uuid.uuid4()), "name": "Choice 1-1", "numVotes": 1},
                {"id": str(uuid.uuid4()), "name": "Choice 1-2", "numVotes": 2},
            ],
            "numWinners": 1,
            "votesAllowed": 1,
            "jurisdictionIds": jurisdiction_ids[:2],
        },
    ]
    rv = put_json(client, f"/api/election/{election_id}/contest", contests)
    assert_ok(rv)

    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    assert rv.status_code == 409
    assert json.loads(rv.data) == {
        "errors": [
            {
                "errorType": "Conflict",
                "message": "Couldn't find contest Bad Contest Name in the CVR for jurisdiction J1",
            }
        ]
    }


def test_contest_choices_dont_match_cvrs(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    cvrs,  # pylint: disable=unused-argument
):
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    contests = [
        {
            "id": str(uuid.uuid4()),
            "name": "Contest 1",
            "isTargeted": True,
            "choices": [
                {"id": str(uuid.uuid4()), "name": "Bad Choice Name", "numVotes": 1,},
                {"id": str(uuid.uuid4()), "name": "Choice 1-2", "numVotes": 2},
                {
                    "id": str(uuid.uuid4()),
                    "name": "Another Bad Choice Name",
                    "numVotes": 1,
                },
            ],
            "numWinners": 1,
            "votesAllowed": 1,
            "jurisdictionIds": jurisdiction_ids[:2],
        },
    ]
    rv = put_json(client, f"/api/election/{election_id}/contest", contests)
    assert_ok(rv)

    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    assert rv.status_code == 409
    assert json.loads(rv.data) == {
        "errors": [
            {
                "errorType": "Conflict",
                "message": "Couldn't find some contest choices (Another Bad Choice Name, Bad Choice Name) in the CVR for jurisdiction J1",
            }
        ]
    }


def test_hybrid_two_rounds(
    client: FlaskClient,
    election_id: str,
    jurisdiction_ids: List[str],  # pylint: disable=unused-argument
    contest_ids: List[str],  # pylint: disable=unused-argument
    election_settings,  # pylint: disable=unused-argument
    manifests,  # pylint: disable=unused-argument
    cvrs,  # pylint: disable=unused-argument
    snapshot,
):
    # AA selects a sample size and launches the audit
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    sample_sizes = json.loads(rv.data)["sampleSizes"]

    rv = post_json(
        client,
        f"/api/election/{election_id}/round",
        {
            "roundNum": 1,
            "sampleSizes": {
                contest_id: sample_sizes[0]
                for contest_id, sample_sizes in sample_sizes.items()
            },
        },
    )
    assert_ok(rv)

    rv = client.get(f"/api/election/{election_id}/round",)
    round_1_id = json.loads(rv.data)["rounds"][0]["id"]

    # Two separate samples (cvr/non-cvr) should have been drawn
    ballot_draws = list(
        SampledBallotDraw.query.join(SampledBallot)
        .join(Batch)
        .join(Jurisdiction)
        .filter_by(election_id=election_id)
        .all()
    )
    sample_size = list(sample_sizes.values())[0][0]
    assert (
        len([draw for draw in ballot_draws if draw.sampled_ballot.batch.has_cvrs])
        == sample_size["sizeCvr"]
    )
    assert (
        len([draw for draw in ballot_draws if not draw.sampled_ballot.batch.has_cvrs])
        == sample_size["sizeNonCvr"]
    )

    # Check that we're sampling ballots from the two jurisdictions that uploaded manifests
    sampled_jurisdictions = {
        draw.sampled_ballot.batch.jurisdiction_id for draw in ballot_draws
    }
    assert sorted(sampled_jurisdictions) == sorted(jurisdiction_ids[:2])

    # JAs create audit boards
    set_logged_in_user(
        client, UserType.JURISDICTION_ADMIN, default_ja_email(election_id)
    )
    for jurisdiction_id in jurisdiction_ids[:2]:
        rv = post_json(
            client,
            f"/api/election/{election_id}/jurisdiction/{jurisdiction_id}/round/{round_1_id}/audit-board",
            [{"name": "Audit Board #1"}],
        )
        assert_ok(rv)

    # Audit boards audit all the ballots.
    # Our goal is to mostly make the audit board interpretations match the CVRs
    # for the target contest, messing up just a couple in order to trigger a
    # second round. For convenience, using the same format as the CVR to
    # specify our audit results.
    # Tabulator, Batch, Ballot, Choice 1-1, Choice 1-2, Choice 2-1, Choice 2-2, Choice 2-3
    # We also specify the expected discrepancies.
    audit_results = {
        # CVR ballots
        # We create fake audit results for them based on the CVR
        ("J1", "TABULATOR1", "BATCH2", 2): ("1,1,0,1,0", (-1, 1)),  # CVR: 0,1,1,1,0
        ("J1", "TABULATOR1", "BATCH2", 3): ("1,0,1,0,1", (None, None)),
        ("J1", "TABULATOR2", "BATCH2", 2): ("1,1,1,1,1", (None, None)),
        ("J1", "TABULATOR2", "BATCH2", 4): (",,1,0,1", (None, None)),
        ("J2", "TABULATOR2", "BATCH1", 1): ("not found", (2, None)),  # CVR: 0,1,1,1,0
        ("J2", "TABULATOR2", "BATCH2", 1): ("1,0,1,0,1", (None, None)),
        ("J2", "TABULATOR2", "BATCH2", 3): ("not found", (2, None)),  # CVR: missing
        # Non-CVR ballots
        # We create fake audit results for them based on the reported margin,
        # like in ballot polling
        ("J1", "TABULATOR3", "BATCH1", 1): ("1,0,1,0,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 2): ("1,0,1,0,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 3): ("1,0,1,0,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 5): ("1,0,1,0,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 8): ("1,0,1,0,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 9): ("1,0,0,1,0", (None, None)),
        ("J1", "TABULATOR3", "BATCH1", 10): ("1,0,0,0,1", (None, None)),
        ("J2", "TABULATOR3", "BATCH1", 1): ("1,0,,,", (None, None)),
        ("J2", "TABULATOR3", "BATCH1", 2): ("1,0,,,", (None, None)),
        ("J2", "TABULATOR3", "BATCH1", 3): ("1,0,,,", (None, None)),
        ("J2", "TABULATOR3", "BATCH1", 5): ("0,1,,,", (None, None)),
        ("J2", "TABULATOR3", "BATCH1", 10): ("0,1,,,", (None, None)),
    }

    target_contest_id, opportunistic_contest_id = contest_ids

    audit_all_ballots(
        round_1_id, audit_results, target_contest_id, opportunistic_contest_id
    )

    # Check the audit report
    set_logged_in_user(client, UserType.AUDIT_ADMIN, DEFAULT_AA_EMAIL)
    rv = client.get(f"/api/election/{election_id}/report")
    assert_match_report(rv.data, snapshot)
    check_discrepancies(rv.data, audit_results)

    # TODO test a second round once escalation works
    # pylint: disable=unreachable
    return

    # Start a second round
    rv = post_json(client, f"/api/election/{election_id}/round", {"roundNum": 2})
    assert_ok(rv)

    rv = client.get(f"/api/election/{election_id}/round",)
    round_2_id = json.loads(rv.data)["rounds"][1]["id"]

    # Sample sizes endpoint should still return round 1 sample size
    rv = client.get(f"/api/election/{election_id}/sample-sizes")
    sample_size_options = json.loads(rv.data)["sampleSizes"]
    assert len(sample_size_options) == 1
    assert sample_size_options[target_contest_id][0] == sample_size

    # For round 2, audit results should match the CVR exactly.
    generate_audit_results(round_2_id)
    audit_results = {}

    audit_all_ballots(
        round_2_id, audit_results, target_contest_id, opportunistic_contest_id
    )

    rv = client.get(f"/api/election/{election_id}/report")
    assert_match_report(rv.data, snapshot)
    check_discrepancies(rv.data, audit_results)
