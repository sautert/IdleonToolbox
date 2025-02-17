import { lavaLog, tryToParse } from '../utility/helpers';
import { getDeityLinkedIndex } from './divinity';
import { isArtifactAcquired } from './sailing';
import { getTalentBonus } from './talents';
import { getSkillMasteryBonusByIndex } from './misc';
import { calculateItemTotalAmount } from './items';
import { getAtomColliderThreshold } from './atomCollider';

export const getPrinter = (idleonData, charactersData, accountData) => {
  const rawPrinter = tryToParse(idleonData?.Print) || idleonData?.Printer;
  const rawExtraPrinter = tryToParse(idleonData?.PrinterXtra) || idleonData?.PrinterXtra;
  return parsePrinter(rawPrinter, rawExtraPrinter, charactersData, accountData);
}

const parsePrinter = (rawPrinter, rawExtraPrinter, charactersData, accountData) => {
  const harriepGodIndex = getDeityLinkedIndex(accountData, charactersData, 3);
  const goldRelic = isArtifactAcquired(accountData?.sailing?.artifacts, 'Gold_Relic');
  const goldRelicBonus = goldRelic?.acquired === 3 ? goldRelic?.eldritchMultiplier : goldRelic?.acquired === 2
    ? goldRelic?.ancientMultiplier
    : 0;
  const wiredInBonus = accountData?.lab?.labBonuses?.find((bonus) => bonus.name === 'Wired_In')?.active;
  const connectedPlayers = accountData?.lab?.connectedPlayers;
  const daysSinceLastSample = accountData?.accountOptions?.[125];
  const orbOfRemembranceKills = accountData?.accountOptions?.[138];
  const divineKnights = charactersData?.filter((character) => character?.class === 'Divine_Knight');
  const highestKingOfRemembrance = divineKnights?.reduce((res, { talents }) => {
    const kingOfRemembrance = getTalentBonus(talents, 3, 'KING_OF_THE_REMEMBERED', false, true);
    if (kingOfRemembrance > res) {
      return kingOfRemembrance
    }
    return res;
  }, 0);

  const skillMasteryBonus = getSkillMasteryBonusByIndex(accountData?.totalSkillsLevels, accountData?.rift, 3);

  const printData = rawPrinter.slice(5, rawPrinter.length); // REMOVE 5 '0' ELEMENTS
  const printExtra = rawExtraPrinter;
  // There are 14 items per character
  // Every 2 items represent an item and it's value in the printer.
  // The first 5 pairs represent the stored samples in the printer.
  // The last 2 pairs represent the samples in production.
  const chunk = 14;
  const extraChunk = 10;

  return charactersData.map((charData, charIndex) => {
    let relevantPrinterData = printData.slice(
      charIndex * chunk,
      charIndex * chunk + chunk
    );
    if (printExtra) {
      const relevantExtraPrinterData = printExtra?.slice(
        charIndex * extraChunk,
        charIndex * extraChunk + extraChunk
      )
      relevantPrinterData.splice(-4, 0, relevantExtraPrinterData);
      relevantPrinterData = relevantPrinterData.flat();
    }
    return relevantPrinterData.reduce(
      (result, printItem, sampleIndex, array) => {
        if (sampleIndex % 2 === 0) {
          const sample = array
            .slice(sampleIndex, sampleIndex + 2)
            .map((item, sampleIndex) => sampleIndex === 0 ? item : item);
          let boostedValue = sample[1];
          const isPlayerConnected = connectedPlayers?.find(({ playerId }) => playerId === charIndex);

          // this._DNprint = .1 + m._customBlock_WorkbenchStuff("ExtraPrinting", this._DRI, 0)
          const extraPrinting = (1 + (daysSinceLastSample * (2 + goldRelicBonus)) / 100)
            * (1 + (highestKingOfRemembrance
              * lavaLog(orbOfRemembranceKills)) / 100) * (1 + skillMasteryBonus / 100)

          const multi = (wiredInBonus && isPlayerConnected ?
            (harriepGodIndex.includes(charIndex)
              ? 6 * extraPrinting
              : 2 * extraPrinting)
            : harriepGodIndex.includes(charIndex)
              ? 3 * extraPrinting
              : extraPrinting)

          boostedValue *= multi;
          const breakdown = [
            { name: 'Lab', value: isPlayerConnected && wiredInBonus ? 2 : 0 },
            { name: 'Harriep God', value: harriepGodIndex.includes(charIndex) ? 3 : 0 },
            { name: 'Skill Mastery', value: 1 + skillMasteryBonus / 100 },
            { name: 'Divine Knight', value: 1 + (highestKingOfRemembrance * lavaLog(orbOfRemembranceKills)) / 100 },
            { name: 'Gold Relic', value: 1 + (daysSinceLastSample * (2 + goldRelicBonus)) / 100 },
          ];

          return [...result, {
            item: sample[0],
            value: sample[1],
            active: sampleIndex >= relevantPrinterData.length - 4,
            boostedValue,
            breakdown
          }];
        }
        return result;
      }, []);
  });
}

export const calcTotals = (account, showAlertWhenFull) => {
  const { printer, storage } = account || {};
  const atomThreshold = getAtomColliderThreshold(account?.accountOptions?.[133]);
  let totals = printer?.reduce((res, character) => {
    character.forEach(({ boostedValue, item, active }) => {
      if (item !== 'Blank' && active) {
        if (res?.[item]) {
          res[item] = { ...res[item], boostedValue: boostedValue + res[item]?.boostedValue };
        } else {
          const storageItem = calculateItemTotalAmount(storage, item, true, true);
          res[item] = { boostedValue, atomable: storageItem >= atomThreshold, storageItem };
        }
      }
    })
    return res;
  }, {});
  totals = calcAtoms(totals, atomThreshold, showAlertWhenFull);
  const totalAtoms = Object.entries(totals)?.reduce((sum, [, slot]) => sum + (slot?.atoms ?? 0), 0);
  return { ...totals, atom: { boostedValue: totalAtoms, atoms: totalAtoms } }
}

const calcAtoms = (totals = {}, atomThreshold, showAlertWhenFull) => {
  return Object.entries(totals)?.reduce((sum, [key, slot]) => {
    const { boostedValue, atomable, storageItem } = slot;
    let val, hasAtoms;
    if (showAlertWhenFull?.checked) {
      hasAtoms = atomable;
    } else {
      const printingMoreThanThreshold = boostedValue >= atomThreshold && !atomable;
      const storageAndPrintingMoreThanThreshold = boostedValue > atomThreshold - storageItem && !atomable;
      if (printingMoreThanThreshold) {
        val = boostedValue - atomThreshold;
      } else if (storageAndPrintingMoreThanThreshold) {
        const diff = atomThreshold - storageItem;
        val = boostedValue - diff;
      } else {
        val = boostedValue
      }
      hasAtoms = printingMoreThanThreshold || storageAndPrintingMoreThanThreshold || atomable;
    }

    sum[key] = {
      ...slot,
      ...(hasAtoms ? { atoms: val / 10e6 } : {})
    }
    return sum;
  }, {});
}