import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { select, json, geoPath, geoAlbers } from 'd3'
import { feature } from 'topojson-client'
// topojson-specification is defined in package.json but throwing linting error here
// eslint-disable-next-line import/no-unresolved
import { Topology } from 'topojson-specification'
import { Colors, Spinner } from '@blueprintjs/core'
import labelValueStates from '../AASetup/Settings/states'
import {
  JurisdictionRoundStatus,
  IJurisdiction,
  getJurisdictionStatus,
} from '../useJurisdictions'
import { IAuditSettings } from '../useAuditSettings'

interface IProps {
  stateName: string | null
  jurisdictions: IJurisdiction[]
  isRoundStarted: boolean
  auditType: IAuditSettings['auditType']
}

const MapWrapper = styled.div`
  position: relative;
`

const SVGMap = styled.svg`
  margin-bottom: 30px;
  .outline {
    fill: none;
    stroke: ${Colors.BLACK};
    stroke-width: 0.5px;
  }
  .mesh {
    fill: none;
    stroke-linejoin: round;
  }
  path {
    fill: none;
    stroke: none;
    stroke-width: 0.5px;
  }
  #single-state {
    stroke: ${Colors.BLACK};
  }
  .county {
    fill: ${Colors.WHITE};
    stroke: ${Colors.BLACK};
  }
  .county:hover {
    stroke-width: 2px;
  }
  .danger {
    fill: ${Colors.RED3};
  }
  .success {
    fill: ${Colors.GREEN4};
  }
  .progress {
    fill: ${Colors.ORANGE4};
  }
  .gray {
    fill: ${Colors.GRAY4};
  }
  .default {
    fill: ${Colors.WHITE};
  }
`

const Tooltip = styled.div`
  display: none;
  position: absolute;
  opacity: 0.9;
  border-radius: 3px;
  background: ${Colors.BLACK};
  padding: 5px;
  color: ${Colors.WHITE};
`

const MapLabels = styled.div`
  position: absolute;
  top: 0;
  z-index: 10;
`

const MapLabelsRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`

const MapLabelsBoxes = styled.div`
  display: inline-block;
  margin-right: 10px;
  width: 20px;
  height: 20px;
  &.danger {
    background-color: ${Colors.RED3};
  }
  &.success {
    background-color: ${Colors.GREEN4};
  }
  &.progress {
    background-color: ${Colors.ORANGE4};
  }
  &.gray {
    background-color: ${Colors.GRAY4};
  }
  &.default {
    border: 1px solid ${Colors.BLACK};
  }
`

const MapSpinner = styled(Spinner)`
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  transform: translateY(-50%);
  margin: 0 auto;
`

const Map = ({
  stateName,
  jurisdictions,
  isRoundStarted,
  auditType,
}: IProps) => {
  const width = 960
  const height = 500
  const d3Container = useRef(null)
  const tooltipContainer = useRef(null)

  const [jsonData, setJsonData] = useState<Topology | undefined>(undefined)

  const getStateName = (abbr: string) => {
    const filteredState = labelValueStates.find(
      ({ value, label }) => value === abbr && label
    )
    return filteredState && filteredState.label
  }

  const getJurisdictionStatusNew = useCallback(
    (countyName: string) => {
      const filteredJurisdiction = jurisdictions.find(
        jurisdiction => jurisdiction.name === countyName
      )

      if (filteredJurisdiction) {
        const jurisdictionStatus = getJurisdictionStatus(filteredJurisdiction)
        switch (jurisdictionStatus) {
          case JurisdictionRoundStatus.COMPLETE:
            return 'success'
          case JurisdictionRoundStatus.FAILED:
            return 'danger'
          case JurisdictionRoundStatus.IN_PROGRESS:
            return 'progress'
          case JurisdictionRoundStatus.NOT_STARTED:
            return 'gray'
          default:
            return 'default'
        }
      }
      // incase of non-pariticpant jurisdictions
      return 'default'
    },
    [jurisdictions]
  )

  useEffect(() => {
    const loadMapData = async () => {
      let respJsonData: Topology | undefined
      try {
        respJsonData = await json(
          'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json'
        )
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`File Error: ${error}`)
        // use local topojson file if CDN link fails to load
        respJsonData = await json('/us-states-counties.json')
      }
      setJsonData(respJsonData)
    }
    loadMapData()
  }, [])

  useEffect(() => {
    const projection = geoAlbers()
    const path = geoPath().projection(projection)

    if (d3Container.current && tooltipContainer.current && jsonData) {
      const svgElement = select(d3Container.current)

      const usState = (feature(
        jsonData,
        jsonData.objects.states
      ) as GeoJSON.FeatureCollection).features.filter(
        d =>
          d &&
          d.properties &&
          stateName &&
          d.properties.name === getStateName(stateName)
      )[0]

      // county ID's initial 2 characters are of state
      // hence, just setting counties of audit state
      const usCounties = (feature(
        jsonData,
        jsonData.objects.counties
      ) as GeoJSON.FeatureCollection).features.filter(
        (d, i) =>
          d &&
          d.id &&
          usState &&
          usState.id &&
          d.id.toString().slice(0, 2) === usState.id.toString()
      )
      projection.fitSize([width, height], usState)

      svgElement
        .append('path')
        .datum(usState)
        .attr('class', 'outline')
        .attr('d', path)
        .attr('id', 'single-state')

      svgElement
        .append('clipPath')
        .attr('id', 'clip-state')
        .append('use')
        .attr('xlink:href', '#single-state')

      svgElement
        .selectAll('path')
        .data(usCounties)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('clip-path', 'url(#clip-state)')
        .attr('class', d => {
          let statusClass = ''
          if (d && d.properties) {
            statusClass = getJurisdictionStatusNew(d.properties.name)
          }
          return `county ${statusClass}`
        })
        .on('mouseover', event => {
          select(tooltipContainer.current)
            .style('display', 'block')
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY}px`)
            .html(event.toElement.__data__.properties.name)
        })
        .on('mouseout', () => {
          select('#tooltip').style('display', 'none')
        })
    }
  }, [jsonData, getJurisdictionStatusNew, stateName, jurisdictions])

  return (
    <MapWrapper>
      <SVGMap
        className="d3-component"
        width={width}
        height={height}
        ref={d3Container}
      />
      <Tooltip id="tooltip" className="hide-tooltip" ref={tooltipContainer} />
      {jsonData ? (
        <MapLabels>
          {isRoundStarted ? (
            <div>
              <MapLabelsRow>
                <MapLabelsBoxes className="success" /> Complete
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="progress" /> In progress
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="gray" /> Not started
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="default" /> Non-Participating
                Jurisdiction
              </MapLabelsRow>
            </div>
          ) : auditType === 'BALLOT_POLLING' ? (
            <div>
              <MapLabelsRow>
                <MapLabelsBoxes className="success" /> Manifest uploaded
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="danger" /> Manifest upload failed
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="gray" /> No manifest uploaded
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="default" /> Non-Participating
                Jurisdiction
              </MapLabelsRow>
            </div>
          ) : (
            <div>
              <MapLabelsRow>
                <MapLabelsBoxes className="success" /> All files uploaded
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="danger" /> File upload failed
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="gray" /> No files uploaded
              </MapLabelsRow>
              <MapLabelsRow>
                <MapLabelsBoxes className="default" /> Non-Participating
                Jurisdiction
              </MapLabelsRow>
            </div>
          )}
        </MapLabels>
      ) : (
        <MapSpinner size={Spinner.SIZE_STANDARD} />
      )}
    </MapWrapper>
  )
}

export default Map
