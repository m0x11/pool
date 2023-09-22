import { Pool } from './pool';
import { Food } from './food';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <canvas id="terrarium" width="100%" height="100%" style="z-index: 0"></canvas>
  </div>
`
const poolFoundation: HTMLElement | null = document.querySelector('#app');
if (poolFoundation) {
  const reflectingPool = new Pool(poolFoundation);
  const food = new Food(poolFoundation);
  //const food = new Food(poolFoundation);
  //const ascii = new Ascii(poolFoundation);
}

