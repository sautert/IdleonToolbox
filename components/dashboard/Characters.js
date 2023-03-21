import React from 'react';
import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { cleanUnderscore, pascalCase, prefix } from "../../utility/helpers";
import styled from "@emotion/styled";
import HtmlTooltip from "../Tooltip";
import {
  hasUnspentPoints,
  isAkfForMoreThanTenHours,
  isAnvilOverdue,
  isMissingEquippedBubble,
  isMissingStarSigns,
  isObolMissing,
  isProductionMissing,
  isTalentReady,
  isTrapMissing,
  isTrapOverdue,
  isWorshipOverdue
} from "../../utility/dashboard/characters";

const Characters = ({ characters, account, lastUpdated, trackers }) => {
  return <>
    <Stack gap={2} direction={'row'} flexWrap={'wrap'}>
      {characters.map((character, characterIndex) => {
        const {
          name,
          tools,
          classIndex,
          afkTarget,
          worship,
          postOffice,
          equippedBubbles,
        } = character;
        const activity = afkTarget !== '_' ? afkTarget : 'Nothing';
        const productionHammersMissing = trackers?.anvil && isProductionMissing(equippedBubbles, account, characterIndex);
        const readyTalents = trackers?.talents && isTalentReady(character);
        const missingObols = trackers?.obols && isObolMissing(character);
        const missingStarSigns = trackers?.starSigns && isMissingStarSigns(character, account);
        return <Card key={name} sx={{ width: 345 }}>
          <CardContent>
            <Stack direction={'row'} alignItems={'center'} gap={1} flexWrap={'wrap'}>
              <Box sx={{ display: { sm: 'none', md: 'block' } }}><img src={`${prefix}data/ClassIcons${classIndex}.png`}
                                                                      alt=""/></Box>
              <Typography>{name}</Typography>
            </Stack>
            <Divider sx={{ my: 1 }}/>
            <Stack direction={'row'} gap={1} flexWrap={'wrap'}>
              <HtmlTooltip title={cleanUnderscore(activity)}>
                <IconImg src={`${prefix}afk_targets/${activity}.png`} alt=""/>
              </HtmlTooltip>
              {trackers?.prayers && isAkfForMoreThanTenHours(character, lastUpdated) ?
                <Alert title={`${name} has unending energy prayer and is afk for more than 10 hours!`}
                       iconPath={'data/Prayer2'}/> : null}
              {trackers?.traps && isTrapOverdue(account, characterIndex) ?
                <Alert title={`${name} traps are overdue!`} iconPath={'data/TrapBoxSet1'}/> : null}
              {trackers?.traps && isTrapMissing(tools, account, characterIndex) ?
                <Alert title={`${name} is missing a trap!`} iconPath={'data/ClassIcons48'}/> : null}
              {trackers?.bubbles && isMissingEquippedBubble(character, account) ?
                <Alert title={`${name} is missing an active bubble!`} iconPath={'data/aJarB0'}/> : null}
              {trackers?.worship && isWorshipOverdue(worship) ?
                <Alert title={`${name} worship is full!`} iconPath={'data/ClassIcons50'}/> : null}
              {trackers?.traps && missingObols?.length > 0 ?
                <Alert title={`${name} has ${missingObols?.length} empty obol slots!`} iconPath={'data/ObolLocked1'}/> : null}
              {trackers?.postOffice && hasUnspentPoints(postOffice) ?
                <Alert title={`${name} has ${postOffice?.unspentPoints} unspent points`}
                       iconPath={'data/UIboxUpg0'}/> : null}
              {trackers?.anvil && productionHammersMissing > 0 ?
                <Alert title={`${name} is missing ${productionHammersMissing} hammers`}
                       iconPath={'data/GemP1'}/> : null}
              {trackers?.anvil && isAnvilOverdue(account, characterIndex) ?
                <Alert title={`${name} anvil production is full!`} iconPath={'data/ClassIcons43'}/> : null}
              {trackers?.starSigns && missingStarSigns > 0 ?
                <Alert title={`${name} is missing ${missingStarSigns} star signs!`}
                       iconPath={'data/SignStar1b'}/> : null}
              {trackers?.talents && readyTalents?.length > 0 ? readyTalents?.map(({ name, skillIndex }, index) => (
                <Alert key={skillIndex + '-' + index} title={`${cleanUnderscore(pascalCase(name))} is ready!`}
                       iconPath={`data/UISkillIcon${skillIndex}`}/>
              )) : null}
            </Stack>
          </CardContent>
        </Card>
      })}
    </Stack>
  </>
};

const Alert = ({ title, iconPath }) => {
  return <HtmlTooltip title={title}>
    <IconImg src={`${prefix}${iconPath}.png`} alt=""/>
  </HtmlTooltip>
}

const IconImg = styled.img`
  width: 35px;
  height: 35px;
  object-fit: contain;
`;

export default Characters;
