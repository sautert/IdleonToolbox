import {
  Badge,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { cleanUnderscore, notateNumber, prefix, randomFloatBetween } from 'utility/helpers';
import React, { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { getJewelBonus, getLabBonus } from '../../../../../parsers/lab';
import { getShinyBonus, getTimeToLevel } from '../../../../../parsers/breeding';
import Timer from '../../../../common/Timer';
import Tooltip from '../../../../Tooltip';

const Pets = ({ pets, lab, fencePetsObject, fencePets, passivesTotals, lastUpdated }) => {
  const [minimized, setMinimized] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [applyThreshold, setApplyThreshold] = useState(false);

  const calcShinyLvMulti = () => {
    const spelunkerObolMulti = getLabBonus(lab.labBonuses, 8); // gem multi
    const emeraldUlthuriteBonus = getJewelBonus(lab.jewels, 15, spelunkerObolMulti);
    const fasterShinyLevelBonus = getShinyBonus(pets, 'Faster_Shiny_Pet_Lv_Up_Rate');
    return 1 + (emeraldUlthuriteBonus + fasterShinyLevelBonus) / 100;
  }
  const fasterShinyLv = useMemo(() => calcShinyLvMulti(), [pets]);

  const fencePetsByTime = useMemo(() => {
    return fencePets?.map((pet) => ({
      ...pet,
      timeLeft: ((pet?.goal - pet?.progress) / fasterShinyLv / (fencePetsObject?.[pet?.monsterRawName] || 1)) * 8.64e+7
    })).sort((a, b) => a?.timeLeft - b?.timeLeft)
  }, [fencePets]);

  return <>
    <Stack direction={'row'} flexWrap={'wrap'} gap={2} my={5}>
      {fencePetsByTime?.map((pet, index) => {
        const missingIcon = (pet?.icon === 'Mface23' || pet?.icon === 'Mface21') && pet?.monsterRawName !== 'shovelR';
        const amount = fencePetsObject?.[pet?.monsterRawName];
        const timeLeft = ((pet?.goal - pet?.progress) / fasterShinyLv / (fencePetsObject?.[pet?.monsterRawName] || 1)) * 8.64e+7;
        const timeLeftToFive = getTimeToLevel(pet, fasterShinyLv, amount, 5);
        return <Badge anchorOrigin={{ vertical: 'top', horizontal: 'left', }} badgeContent={amount} color="primary"
                      key={'fence' + index}>
          <Card sx={{ width: 200, display: 'flex', alignItems: 'center', p: 0 }}>
            <CardContent sx={{ '&:last-child': { padding: 1 } }}>
              <Stack alignItems={'center'} direction="row" gap={1}>
                <MonsterIcon
                  style={{ filter: `hue-rotate(${randomFloatBetween(45, 180)}deg)` }}
                  src={missingIcon ? `${prefix}afk_targets/${pet?.monsterName}.png` : `${prefix}data/${pet?.icon}.png`}
                  missingIcon={missingIcon}
                  alt=""/>
                <Stack>
                  <Typography>Lv. {pet?.shinyLevel}</Typography>
                  <Stack direction={'row'} gap={1}>
                    <Typography component={'span'} variant={'caption'}>Next:</Typography>
                    <Timer variant={'caption'} type={'countdown'} lastUpdated={lastUpdated}
                           staticTime={pet?.progress === 0}
                           date={new Date().getTime() + (timeLeft)}/>
                  </Stack>
                  {timeLeftToFive > 0 && timeLeftToFive !== timeLeft ? <Stack direction={'row'} gap={1}>
                    <Typography component={'span'} variant={'caption'}>To 5:</Typography>
                    <Timer variant={'caption'} type={'countdown'} lastUpdated={lastUpdated}
                           staticTime={pet?.progress === 0}
                           date={new Date().getTime() + (timeLeftToFive)}/>
                  </Stack> : null}
                </Stack>
              </Stack>
              <Stack sx={{ mt: 1 }}>
                <Typography textAlign={'center'}
                            variant={'caption'}>{cleanUnderscore(pet?.passive)} ({passivesTotals?.[pet?.rawPassive]})</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Badge>
      })}
    </Stack>
    <Stack justifyContent={'center'} flexWrap={'wrap'} gap={2}>
      <Stack>
        <FormControlLabel
          control={<Checkbox name={'mini'} checked={minimized}
                             size={'small'}
                             onChange={() => setMinimized(!minimized)}/>}
          label={'Compact view'}/>
        <FormControlLabel
          control={<Checkbox name={'mini'} checked={applyThreshold}
                             size={'small'}
                             onChange={() => setApplyThreshold(!applyThreshold)}/>}
          label={'Apply level threshold'}/>
        <TextField sx={{ width: 'fit-content' }}
                   type={'number'} value={threshold} label={'Pet level threshold'}
                   onChange={(e) => setThreshold(e.target.value)}
                   helperText={'Show pets under this level only'}/>
      </Stack>
      {pets?.map((world, worldIndex) => {
        return <React.Fragment key={`world-${worldIndex}`}>
          <Typography variant={'h3'}>World {worldIndex + 1}</Typography>
          <Card key={`world-${worldIndex}`}>
            <CardContent>
              <Stack direction={'row'} flexWrap={'wrap'} gap={1}>
                {world?.map(({
                               monsterName,
                               monsterRawName,
                               icon,
                               passive,
                               level,
                               shinyLevel,
                               gene,
                               unlocked,
                               progress,
                               goal
                             }) => {
                  const timeLeft = ((goal - progress) / fasterShinyLv / (fencePetsObject?.[monsterRawName] || 1)) * 8.64e+7;
                  if (applyThreshold && shinyLevel >= threshold) return;
                  const missingIcon = (icon === 'Mface23' || icon === 'Mface21') && monsterRawName !== 'shovelR';
                  return <Card key={`${monsterName}-${worldIndex}`} variant={'outlined'}
                               sx={{ opacity: unlocked ? 1 : .6 }}>
                    <CardContent sx={{ width: 300 }}>
                      <Stack direction={'row'} alignItems={'center'} gap={1}>
                        <MonsterIcon
                          src={missingIcon ? `${prefix}afk_targets/${monsterName}.png` : `${prefix}data/${icon}.png`}
                          missingIcon={missingIcon}
                          alt=""/>
                        <Stack>
                          <Typography>{cleanUnderscore(monsterName)}</Typography>
                          <Typography variant={'caption'}>Lv. {level}</Typography>
                          <Typography variant={'caption'} sx={{ opacity: shinyLevel > 0 ? 1 : .6 }}>Shiny
                            Lv. {shinyLevel}</Typography>
                          <Tooltip title={`Faster Shiny Level Multi: ${fasterShinyLv}x`}>
                            <Typography variant={'caption'}>Days {notateNumber(progress)} / {goal}</Typography>
                          </Tooltip>
                          {<Timer type={'countdown'} lastUpdated={lastUpdated}
                                  staticTime={progress === 0}
                                  date={new Date().getTime() + (timeLeft)}/>}
                        </Stack>
                      </Stack>
                      <Divider sx={{ my: 1 }}/>
                      <Stack sx={{ opacity: shinyLevel > 0 ? 1 : .6 }}>
                        <Typography variant={'caption'}>Shiny Passive:</Typography>
                        <Typography>{cleanUnderscore(passive)}</Typography>
                      </Stack>
                      <Divider sx={{ my: 1 }}/>
                      <Stack>
                        <Typography variant={'caption'}>Gene:</Typography>
                        <Stack direction={'row'} gap={1}>
                          <GeneIcon src={`${prefix}data/GeneReady${gene?.index}.png`} alt=""/>
                          <Typography>{cleanUnderscore(gene?.name)}</Typography>
                        </Stack>
                      </Stack>
                      {!minimized ? <>
                        <Stack sx={{ mt: 2 }}>
                          <Typography variant={'caption'} sx={{ color: 'error.light' }}>Combat Ability:</Typography>
                          <Typography>{cleanUnderscore(gene?.combatAbility)}</Typography>
                        </Stack>
                        <Stack sx={{ mt: 1 }}>
                          <Typography variant={'caption'} sx={{ color: 'success.light' }}>Bonus Ability:</Typography>
                          <Typography>{cleanUnderscore(gene?.bonusAbility)}</Typography>
                        </Stack>
                      </> : null}
                    </CardContent>
                  </Card>
                })}
              </Stack>
            </CardContent>
          </Card>
        </React.Fragment>
      })}
    </Stack>
  </>
};


const GeneIcon = styled.img`
  width: 44px;
  height: 44px;
`
const MonsterIcon = styled.img`
  width: 48px;
  height: 48px;
  object-fit: ${({ missingIcon }) => missingIcon ? 'contain' : 'none'};
  ${({ missingIcon }) => missingIcon && `object-position: 0 100%;`}
`
export default Pets;
