import {parseBalanceMap} from './parse-balance-map';
import v2PolAusdcRescueMap from './maps/polygon/v2_ausdcRescueMap.json';
import fs from 'fs';

// phase 2
const v2PolAusdcPath = `./js-scripts/maps/polygon/v2_ausdcRescueMerkleTree.json`;
fs.writeFileSync(
  v2PolAusdcPath,
  JSON.stringify(parseBalanceMap(v2PolAusdcRescueMap, 6, 'polygon_v2_ausdc'))
);
