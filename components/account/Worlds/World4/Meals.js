import React, { useEffect, useMemo, useState } from 'react';
import { calcMealTime, calcTimeToNextLevel, getMealLevelCost } from 'parsers/cooking';
import { cleanUnderscore, growth, kFormatter, notateNumber, numberWithCommas, prefix } from 'utility/helpers';
import { Card, CardContent, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import styled from '@emotion/styled';
import Tooltip from 'components/Tooltip';
import HtmlTooltip from 'components/Tooltip';
import Box from '@mui/material/Box';
import Timer from 'components/common/Timer';
import InfoIcon from '@mui/icons-material/Info';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuItem from '@mui/material/MenuItem';
import { isArtifactAcquired } from '../../../../parsers/sailing';
import { getJewelBonus, getLabBonus } from '../../../../parsers/lab';

const msPerDay = 8.64e+7;
const maxTimeValue = 9.007199254740992e+15;
let DEFAULT_MEAL_MAX_LEVEL = 30;
const breakpoints = [-1, 0, 11, 30, 40, 50, 60];
const Meals = ({ characters, meals, totalMealSpeed, achievements, artifacts, lab, equinoxUpgrades }) => {
  const [filters, setFilters] = React.useState(() => []);
  const [localMeals, setLocalMeals] = useState();
  const [bestSpeedMeal, setBestSpeedMeal] = useState([]);
  const [mealMaxLevel, setMealMaxLevel] = useState(DEFAULT_MEAL_MAX_LEVEL);
  const [mealSpeed, setMealSpeed] = useState(totalMealSpeed);
  const [sortBy, setSortBy] = useState(breakpoints[0]);
  const spelunkerObolMulti = getLabBonus(lab.labBonuses, 8); // gem multi
  const blackDiamondRhinestone = getJewelBonus(lab?.jewels, 16, spelunkerObolMulti);
  const allPurpleActive = lab.jewels?.slice(0, 3)?.every(({ active }) => active) ? 2 : 1;
  const realAmethystRhinestone = getJewelBonus(lab.jewels, 0, spelunkerObolMulti) * allPurpleActive;
  const amethystRhinestone = 4.5;

  const getHighestOverflowingLadle = () => {
    const bloodBerserkers = characters?.filter((character) => character?.class === 'Blood_Berserker');
    return bloodBerserkers.reduce((res, { talents }) => {
      const overflowingLadle = talents?.[3]?.orderedTalents.find((talent) => talent?.name === 'OVERFLOWING_LADLE');
      const lv = overflowingLadle?.level > overflowingLadle?.maxLevel
        ? overflowingLadle?.level
        : overflowingLadle?.maxLevel;
      const bonus = growth(overflowingLadle?.funcX, lv, overflowingLadle?.x1, overflowingLadle?.x2, false);
      if (bonus > res) {
        return bonus
      }
      return res;
    }, 0);
  }
  const overflowingLadleBonus = useMemo(() => getHighestOverflowingLadle(), [characters]);
  const calcMeals = (meals, overflow) => {
    return meals?.map((meal) => {
      if (!meal) return null;
      const { amount, level, cookReq } = meal;
      const levelCost = getMealLevelCost(level, achievements, equinoxUpgrades);
      let timeTillNextLevel = amount >= levelCost ? '0' : calcTimeToNextLevel(levelCost - amount, cookReq, mealSpeed);
      if (overflow) {
        timeTillNextLevel = timeTillNextLevel / (1 + overflowingLadleBonus / 100);
      }
      const breakpointTimes = breakpoints.map((breakpoint) => {
        if (breakpoint === 0 || breakpoint === -1) {
          const timeTillNextLevel = amount >= levelCost
            ? '0'
            : calcTimeToNextLevel(levelCost - amount, cookReq, mealSpeed);
          return {
            bpCost: levelCost,
            bpLevel: breakpoint,
            timeToBp: overflow ? timeTillNextLevel / (1 + overflowingLadleBonus / 100) : timeTillNextLevel
          };
        }
        const bpCost = (breakpoint - level) * levelCost;
        let timeToBp = calcMealTime(breakpoint, meal, mealSpeed, achievements, equinoxUpgrades);
        if (overflow) {
          timeToBp = timeToBp / (1 + overflowingLadleBonus / 100)
        }
        return { bpCost, timeToBp, bpLevel: breakpoint };
      })
      return {
        ...meal,
        levelCost,
        timeTillNextLevel,
        breakpointTimes
      };
    });
  };

  const defaultMeals = useMemo(() => calcMeals(meals), [meals, mealSpeed]);

  useEffect(() => {
    const causticolumnArtifact = isArtifactAcquired(artifacts, 'Causticolumn');
    if (causticolumnArtifact) {
      setMealMaxLevel(DEFAULT_MEAL_MAX_LEVEL + causticolumnArtifact?.bonus);
    }
  }, [artifacts]);

  const handleFilters = (e, newFilters) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    let tempMeals = defaultMeals;
    breakpoints.forEach((breakpoint, index) => {
      if (sortBy === breakpoint) {
        const mealsCopy = [...defaultMeals];
        tempMeals = sortMealsBy(mealsCopy, index, breakpoint);
      }
    })
    if (filters.includes('overflow')) {
      tempMeals = calcMeals(tempMeals || meals, overflowingLadleBonus)
    }
    if (filters.includes('hide')) {
      tempMeals = tempMeals.filter((meal) => meal?.level < mealMaxLevel);
    }
    if (filters.includes('amethystRhinestone') && realAmethystRhinestone === 0) {
      setMealSpeed(totalMealSpeed * amethystRhinestone);
    } else {
      setMealSpeed(totalMealSpeed);
    }
    const speedMeals = getBestMealsSpeedContribute(tempMeals)
    setBestSpeedMeal(speedMeals);
    setLocalMeals(tempMeals)
  }, [filters, meals, mealMaxLevel, sortBy, mealSpeed]);

  const sortMealsBy = (meals, index, level = 0) => {
    const mealsCopy = [...defaultMeals];
    mealsCopy.sort((a, b) => {
      if (level !== 0) {
        if (a.level >= level) {
          return 1;
        } else if (b.level >= level) {
          return -1;
        }
      }
      const aSortIndex = a?.breakpointTimes?.[index]?.timeToBp;
      const bSortIndex = b?.breakpointTimes?.[index]?.timeToBp;
      return aSortIndex - bSortIndex;
    });
    return mealsCopy;
  }

  const getBestMealsSpeedContribute = (meals) => {
    let speedMeals = meals.filter((meal) => (meal?.stat === 'Mcook' || meal?.stat === 'KitchenEff') && meal?.level < mealMaxLevel);
    speedMeals = speedMeals.map((meal) => {
      const { level, baseStat, shinyMulti, timeTillNextLevel } = meal;
      const currentBonus = (1 + (blackDiamondRhinestone + shinyMulti) / 100) * level * baseStat;
      const nextLevelBonus = (1 + (blackDiamondRhinestone + shinyMulti) / 100) * (level + 1) * baseStat;
      return {
        ...meal,
        currentLevelBonus: notateNumber(currentBonus),
        nextLevelBonus: notateNumber(nextLevelBonus),
        bonusDiff: nextLevelBonus - currentBonus,
        diff: (nextLevelBonus - currentBonus) / timeTillNextLevel
      }
    });
    speedMeals.sort((a, b) => b.diff - a.diff);
    return speedMeals;
  }

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  }

  return (
    <>
      <ToggleButtonGroup sx={{ my: 2, flexWrap: 'wrap' }} value={filters} onChange={handleFilters}>
        <ToggleButton value="minimized">Minimized</ToggleButton>
        <ToggleButton value="hide">Hide capped</ToggleButton>
        <ToggleButton value="overflow">
          <Stack direction={'row'} gap={1}>
            <Typography>Overflowing Ladle</Typography>
            <Tooltip
              title={`Blood Berserker Talent: Ladles gives ${kFormatter(overflowingLadleBonus, 2)}% more afk time`}>
              <InfoIcon/>
            </Tooltip>
          </Stack>
        </ToggleButton>
        <ToggleButton value="amethystRhinestone">
          <Stack direction={'row'} gap={1}>
            <Typography>Amethyst Rhinestone</Typography>
            <Tooltip
              title={`Apply additional 4.5 multi bonus`}>
              <InfoIcon/>
            </Tooltip>
          </Stack>
        </ToggleButton>
      </ToggleButtonGroup>
      <Stack direction={'row'} alignItems={'center'} gap={3}>
        <TextField sx={{ width: 150 }} label={'Sort by'} select value={sortBy} onChange={handleSortChange}>
          {breakpoints?.map((val) => (<MenuItem key={val} value={val}>
            {val === -1 ? 'Order' : val === 0 ? 'Time' : `Time to ${val}`}
          </MenuItem>))}
        </TextField>
        {breakpoints?.map((breakpoint) => {
          if (breakpoint === 0 || breakpoint === -1) return null;
          return sortBy === breakpoint && !localMeals?.some(({ level, amount }) => amount > 0 && level < breakpoint) ?
            <Typography key={'breakpoint-max' + breakpoint} sx={{ color: '#ffa726' }}>All meals are higher than level {breakpoint}
              !</Typography> : null;
        })}
      </Stack>
      <Stack my={2}>
        <Typography my={1} variant={'h5'}>Best meal speed contribution</Typography>
        <Stack gap={2} direction={'row'} flexWrap={'wrap'}>
          {bestSpeedMeal.map((meal, index) => {
            const {
              currentLevelBonus,
              nextLevelBonus,
              level,
              name,
              rawName,
              bonusDiff,
              timeTillNextLevel
            } = meal;
            return <Card key={`${name}-${index}`} sx={{ width: 340 }}>
              <CardContent>
                <Stack direction={'row'} alignItems={'center'}>
                  <MealAndPlate>
                    <img src={`${prefix}data/${rawName}.png`} alt=""/>
                    {level > 0 ?
                      <img className="plate" src={`${prefix}data/CookingPlate${level - 1}.png`} alt=""/> : null}
                  </MealAndPlate>
                  <Stack gap={1}>
                    <CenteredTypography>
                      {cleanUnderscore(name)} (Lv. {level} <ArrowForwardIcon fontSize={'small'}/> {level + 1})
                    </CenteredTypography>
                    <CenteredTypography>
                      {currentLevelBonus}% <ArrowForwardIcon fontSize={'small'}/> {nextLevelBonus}%
                      ({kFormatter(bonusDiff)})
                    </CenteredTypography>
                    <Typography component={'span'}>
                      Next level: {timeTillNextLevel * 3600 * 1000 < maxTimeValue ?
                      <Timer date={new Date().getTime() + timeTillNextLevel * 3600 * 1000}
                             staticTime={true}/> : `${getTimeAsDays(timeTillNextLevel)} days`}
                    </Typography>
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <img src={`${prefix}data/Ladle.png`} alt="" width={32} height={32}/>
                      <HtmlTooltip title={numberWithCommas(parseFloat(timeTillNextLevel).toFixed(2))}>
                        <span>{notateNumber(Math.ceil(timeTillNextLevel), 'Big')}</span>
                      </HtmlTooltip>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          })}
        </Stack>
      </Stack>
      <Typography my={1} variant={'h5'}>Meals</Typography>
      <Stack direction={'row'} flexWrap="wrap" gap={2}>
        {localMeals?.map((meal, index) => {
          if (!meal) return null;
          const {
            name,
            amount,
            rawName,
            effect,
            level,
            baseStat,
            multiplier,
            shinyMulti,
            breakpointTimes
          } = meal;
          const realEffect = (1 + (blackDiamondRhinestone + shinyMulti) / 100) * level * baseStat;
          return (
            <Card key={`${name}-${index}`} sx={{ width: 300, opacity: level === 0 ? 0.5 : 1 }}>
              <CardContent>
                <Stack direction={'row'} alignItems={'center'}>
                  <Tooltip title={<MealTooltip achievements={achievements} {...meal} />}>
                    <MealAndPlate>
                      <img src={`${prefix}data/${rawName}.png`} alt=""/>
                      {level > 0 ?
                        <img className="plate" src={`${prefix}data/CookingPlate${level - 1}.png`} alt=""/> : null}
                    </MealAndPlate>
                  </Tooltip>
                  <Typography>
                    {cleanUnderscore(name)} (Lv. {level})
                  </Typography>
                </Stack>
                <Stack mt={2} gap={1}>
                  <Typography
                    sx={{
                      color: multiplier > 1
                        ? 'info.light'
                        : ''
                    }}>{cleanUnderscore(effect?.replace('{', kFormatter(realEffect)))}</Typography>
                  {!filters.includes('minimized') ?
                    breakpointTimes?.map(({ bpLevel, bpCost, timeToBp }) => {
                      const timeInMs = timeToBp * 3600 * 1000
                      return level > 0 && (sortBy === bpLevel || sortBy === -1 && bpLevel === 1) ? <Stack
                        key={name + bpLevel} gap={1}
                        flexWrap={'wrap'}>
                        {amount >= bpCost || level >= mealMaxLevel ? <Typography
                            color={'success.light'}>MAXED</Typography> :
                          <Typography
                            sx={{ color: amount >= bpCost ? 'success.light' : level > 0 ? 'error.light' : '' }}>
                            Progress: {<HtmlTooltip title={parseFloat(amount)}>
                            <span>{notateNumber(Math.floor(amount), 'Big')}</span>
                          </HtmlTooltip>} / {<HtmlTooltip title={parseFloat(bpCost)}>
                            <span>{notateNumber(Math.ceil(bpCost), 'Big')}</span>
                          </HtmlTooltip>}
                          </Typography>
                        }
                        <Stack direction={'row'} gap={1} flexWrap={'wrap'}>
                          <Typography>Next milestone: </Typography>
                          {timeInMs < maxTimeValue
                            ? <Timer
                              date={new Date().getTime() + timeToBp * 3600 * 1000}
                              staticTime={true}/>
                            : `${notateNumber(getTimeAsDays(timeToBp), 'Big')} days`
                          }
                        </Stack>
                        <Stack direction={'row'} alignItems={'center'} gap={1}>
                          <img src={`${prefix}data/Ladle.png`} alt="" width={32} height={32}/>
                          <HtmlTooltip title={numberWithCommas(parseFloat(timeToBp).toFixed(2))}>
                            <span>{notateNumber(Math.ceil(timeToBp), 'Big')}</span>
                          </HtmlTooltip>
                        </Stack>
                      </Stack> : null
                    }) : null}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </>
  );
};

// Calculating days manually because of JS limitation for dates https://262.ecma-international.org/5.1/#sec-15.9.1.1
const getTimeAsDays = (time) => {
  return Math.ceil(time * 3600 * 1000 / msPerDay);
}

const MealTooltip = ({ level, baseStat, multiplier, effect, achievements, equinoxUpgrades }) => {
  const levelCost = getMealLevelCost(level + 1, achievements, equinoxUpgrades);
  return (
    <>
      <Typography fontWeight={'bold'}>
        Next level bonus:&nbsp;
        <Typography component={'span'} sx={{ fontWeight: 400 }}>
          {cleanUnderscore(effect?.replace('{', kFormatter((level + 1) * baseStat * multiplier)))}
        </Typography>
      </Typography>
      <Box>
        <Typography fontWeight={'bold'}>
          Next level req:&nbsp;
          <Typography component={'span'} sx={{ fontWeight: 400 }}>
            {numberWithCommas(parseInt(levelCost))}
          </Typography>
        </Typography>
      </Box>
    </>
  );
};

const MealAndPlate = styled.div`
  width: 82px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: -20px;

  & img:nth-of-type(1) {
    margin-top: -30px;
  }

  & img {
    margin-left: -30px;
  }
`;

const CenteredTypography = styled(Typography)`
  & {
    display: flex;
    align-items: center;
  }
`

export default Meals;
