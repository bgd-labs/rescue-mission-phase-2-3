import polygonAusdcRescueMap from './maps/polygon/v2_ausdcRescueMap.json';
import { normalize } from '@aave/math-utils';
import fs from 'fs';

const format = (
  jsonObj: Record<string, { amount: string; label?: string }>,
  name: string,
  decimals: number,
  network: string,
  market: string
) => {
  const newObj: Record<string, string> = {};
  Object.keys(jsonObj).forEach((key) => {
    newObj[key] = `${normalize(jsonObj[key].amount, decimals)} ${name}${
      jsonObj[key].label ? ` ${jsonObj[key].label}` : ''
    }`;
  });

  const path = `./js-scripts/maps/${network}/${market}_${name}RescueMapFormatted.json`;
  fs.writeFileSync(path, JSON.stringify(newObj, null, 2));
};

format(polygonAusdcRescueMap, 'ausdc', 6, 'polygon', 'v2');
