import React from 'react';
import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { cleanUnderscore, prefix } from '../../../../../utility/helpers';
import styled from '@emotion/styled';
import InfoIcon from '@mui/icons-material/Info';
import Tooltip from '../../../../Tooltip';
import { TitleAndValue } from '../../../../common/styles';
import processString from 'react-process-string';

const Artifacts = ({ artifacts }) => {
  return <Stack direction={'row'} gap={2} flexWrap={'wrap'}>
    {artifacts?.map(({
                       name,
                       description,
                       ancientFormDescription,
                       eldritchFormDescription,
                       rawName,
                       acquired,
                       additionalData
                     }, index) => {
      return <Card key={name + index} variant={acquired ? 'elevation' : 'outlined'}>
        <CardContent>
          <Stack sx={{ width: 200 }}>
            <Stack direction={'row'} gap={1}>
              <ArtifactImg src={`${prefix}data/${rawName}.png`} alt=""/>
              <Typography>{cleanUnderscore(name)}</Typography>
            </Stack>
            <Divider sx={{ my: 2 }}/>
            <Stack flexWrap={'wrap'}>
              <Typography sx={{ minHeight: 150 }} component={'div'}>{processString([{
                regex: /Total bonus.*/gi,
                fn: (key, result) => {
                  return <div key={key} style={{ marginTop: 15 }}>{result[0]}</div>
                }
              }])(cleanUnderscore(description))}</Typography>
              {Array.isArray(additionalData) ? <>
                <Tooltip title={getTooltip(name, additionalData)}>
                  <InfoIcon/>
                </Tooltip>
              </> : <Typography>{additionalData}&nbsp;</Typography>}
              <Divider flexItem color={'gold'} sx={{ my: 2 }}/>
              <Typography
                sx={{
                  opacity: acquired === 2 || acquired === 3 ? 1 : .5,
                  color: acquired === 3 ? '#ffa092' : acquired === 2 ? 'gold' : 'white'
                }}>{cleanUnderscore(acquired === 2 ? ancientFormDescription : acquired === 3
                ? eldritchFormDescription
                : '')}</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    })}
  </Stack>
};

const getTooltip = (name, additionalData) => {
  const map = {
    Crystal_Steak: <StatsTooltip additionalData={additionalData}/>,
    Socrates: <AllStatsTooltip additionalData={additionalData}/>
  }
  return map[name] || <></>;
}

const StatsTooltip = ({ additionalData }) => {
  return <>
    <Typography sx={{ fontWeight: 'bold' }} mb={1} variant={'subtitle1'}>Total Damage</Typography>
    {additionalData?.map(({ name, bonus }, index) => <TitleAndValue key={`stat-${name}-${index}`}
                                                                    boldTitle
                                                                    title={name}
                                                                    value={`${bonus}%`}
    />)}
  </>
}

const AllStatsTooltip = ({ additionalData }) => {
  return <>
    <Typography sx={{ fontWeight: 'bold' }} mb={1} variant={'subtitle1'}>All stats (STR/AGI/WIS/LUK)</Typography>
    {additionalData?.map(({ name, strength, agility, wisdom, luck }, index) => <TitleAndValue
      key={`all-stat-${name}-${index}`}
      boldTitle
      title={name}
      value={`${strength}/${agility}/${wisdom}/${luck}`}
    />)}
  </>
}

const ArtifactImg = styled.img`
  object-fit: contain;
`

export default Artifacts;
