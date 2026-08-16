// The row of expansion toggles under the hero panel.

import { EXPANSIONS } from '../data/expansions.js';
import { state } from '../lib/state.js';

/**
 * @param {() => void} onToggle called after an expansion is switched on or off
 */
export function renderChips(onToggle) {
  const row = document.getElementById('chipsRow');
  row.replaceChildren();

  for (const exp of EXPANSIONS) {
    const chip = document.createElement('label');
    chip.className = `chip${exp.locked ? ' locked' : ''}`;
    chip.style.setProperty('--chip-color', exp.color);
    chip.dataset.active = state.owned.has(exp.id);

    const swatch = document.createElement('span');
    swatch.className = 'swatch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = state.owned.has(exp.id);
    input.disabled = exp.locked;
    input.dataset.exp = exp.id;

    chip.append(swatch, input, ` ${exp.label}${exp.locked ? ' (base game)' : ''}`);

    if (!exp.locked) {
      input.addEventListener('change', (e) => {
        if (e.target.checked) state.owned.add(exp.id);
        else state.owned.delete(exp.id);
        chip.dataset.active = e.target.checked;
        onToggle();
      });
    }

    row.appendChild(chip);
  }
}
