import { getStampsBonusByEffect } from './stamps';
import { round } from '../utility/helpers';
import { getCardBonusByEffect } from './cards';
import { getCharacterByHighestTalent, getHighestTalentByClass, getTalentBonusIfActive, mainStatMap } from './talents';
import { getPostOfficeBonus } from './postoffice';
import { getActiveBubbleBonus, getBubbleBonus } from './alchemy';

export const getMaxCharge = (character, account) => {
  const mainStat = mainStatMap?.[character?.class];
  const cardBonus = getCardBonusByEffect(account?.cards, 'Max_Charge');
  const postOfficeBonus = getPostOfficeBonus(character?.postOffice, 'Crate_of_the_Creator', 1);
  const wizardTalentBonus = getTalentBonusIfActive(character?.activeBuffs, 'CHARGE_SYPHON', 'y');
  const stampBonus = getStampsBonusByEffect(account?.stamps, 'Max_Charge', character);
  const bubbleBonus = getBubbleBonus(account?.alchemy?.bubbles, 'high-iq', 'GOSPEL_LEADER', false, mainStat === 'wisdom');
  const activeBubbleBonus = getActiveBubbleBonus(character?.equippedBubbles, 'high-iq', 'CALL_ME_POPE', account);
  const skullSpeed = character?.tools?.[5]?.rawName !== 'Blank' ? character?.tools?.[5]?.lvReqToCraft : 0;
  // console.log('character', character?.name)
  // console.log('cardBonus', cardBonus)
  // console.log('postOfficeBonus', postOfficeBonus)
  // console.log('wizardTalentBonus', wizardTalentBonus)
  // console.log('stampBonus', stampBonus)
  // console.log('bubbleBonus', bubbleBonus)
  // console.log('skillLevel', Math.floor(character?.skillsInfo?.worship?.level / 10))
  // console.log('skullCapa', Math.round(skullSpeed))
  // console.log('active', Math.max(activeBubbleBonus, 1))
  // console.log('_----------------------------_')
  return Math.floor(Math.max(50, cardBonus
    + postOfficeBonus + (wizardTalentBonus + (stampBonus
      + bubbleBonus
      * Math.floor(character?.skillsInfo?.worship?.level / 10)) + Math.round(skullSpeed) * Math.max(activeBubbleBonus, 1))))
};

export const getChargeRate = (character, account) => {
  const skullSpeed = character?.tools?.[5]?.rawName !== 'Blank' ? character?.tools?.[5]?.Speed : 0;
  const cardBonus = getCardBonusByEffect(account?.cards, 'Charge_Rate');
  const stampBonus = getStampsBonusByEffect(account?.stamps, 'Charge_Rate_per_Hour', character);
  const wizardTalentBonus = getTalentBonusIfActive(character?.activeBuffs, 'CHARGE_SYPHON', 'y');
  const activeBubbleBonus = getActiveBubbleBonus(character?.equippedBubbles, 'high-iq', 'CALL_ME_POPE', account)
  if (skullSpeed < 3) {
    return 6 / Math.max(5.7 + Math.pow(4 - skullSpeed, 2.2) - (.9 * Math.pow(character?.skillsInfo?.worship?.level, .5) /
        (Math.pow(character?.skillsInfo?.worship?.level, .5) + 250) + .6 * character?.skillsInfo?.worship?.level /
        (character?.skillsInfo?.worship?.level + 40)), .57) * Math.max(activeBubbleBonus, 1)
      * (1 + (cardBonus + stampBonus) / 100) * Math.max(wizardTalentBonus, 1);
  } else {
    return (6 / Math.max(5.7 - (0.2 * Math.pow(skullSpeed, 1.3) + ((0.9 * Math.pow(character?.skillsInfo?.worship?.level, 0.5)) /
        (Math.pow(character?.skillsInfo?.worship?.level, 0.5) + 250) + (0.6 * character?.skillsInfo?.worship?.level) / (character?.skillsInfo?.worship?.level + 40))), 0.57))
      * Math.max(activeBubbleBonus, 1) * (1 + (cardBonus + stampBonus) / 100)
      * Math.max(wizardTalentBonus, 1)
  }
};

export const getPlayerWorship = (character, pages, account, playerCharge) => {
  const maxCharge = getMaxCharge(character, account)
  const chargeRate = getChargeRate(character, account);
  const afkFor = new Date().getTime() - character.afkTime;
  const estimatedCharge = Math.min(parseInt(playerCharge) + chargeRate * (afkFor / 1000 / 3600), maxCharge);
  return {
    maxCharge: round(maxCharge),
    chargeRate: round(chargeRate),
    currentCharge: round(estimatedCharge)
  };
};

export const getClosestWorshiper = (characters) => {
  return characters?.reduce((closestWorshiper, character) => {
    const timeLeft = (character?.worship?.maxCharge - character?.worship?.currentCharge) / character?.worship?.chargeRate * 1000 * 3600;
    if (closestWorshiper?.timeLeft === 0 || timeLeft < closestWorshiper?.timeLeft) {
      return { character: character?.name, timeLeft };
    }
    return closestWorshiper;
  }, { character: null, timeLeft: 0 })
}

export const getChargeWithSyphon = (characters) => {
  const totalCharge = characters?.reduce((res, { worship }) => res + worship?.currentCharge, 0);
  const totalChargeRate = characters?.reduce((res, { worship }) => res + worship?.chargeRate, 0);
  const bestChargeSyphon = getHighestTalentByClass(characters, 2, 'Wizard', 'CHARGE_SYPHON', 'y');
  const bestWizard = getCharacterByHighestTalent(characters, 2, 'Wizard', 'CHARGE_SYPHON', 'y');

  return {
    bestWizard,
    totalCharge,
    bestChargeSyphon,
    totalChargeRate,
    timeToOverCharge: new Date().getTime() + (((bestWizard?.worship?.maxCharge + bestChargeSyphon) - totalCharge) / totalChargeRate * 1000 * 3600)
  }
}