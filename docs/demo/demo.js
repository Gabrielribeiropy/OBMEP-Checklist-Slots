const seed = [
  { number: 101, level: 1, steps: [true, true, true] },
  { number: 112, level: 1, steps: [true, true, false] },
  { number: 205, level: 2, steps: [true, false, false] },
  { number: 218, level: 2, steps: [false, false, false] },
  { number: 304, level: 3, steps: [true, true, true] },
  { number: 327, level: 3, steps: [false, false, false] }
];
const labels = ['Provas', 'Corretores e revisores', 'Notas'];
let lots = seed.map(lot => ({ ...lot, steps: [...lot.steps] }));
const stats = document.getElementById('stats');
const list = document.getElementById('lots');
const empty = document.getElementById('empty');
const filter = document.getElementById('filter');
const search = document.getElementById('search');

function render() {
  const done = lots.filter(lot => lot.steps.every(Boolean)).length;
  const confirmations = lots.reduce((count, lot) => count + lot.steps.filter(Boolean).length, 0);
  stats.replaceChildren();
  for (const [value, label] of [[lots.length, 'Lotes de exemplo'], [done, 'Concluídos'], [confirmations, 'Etapas confirmadas']]) {
    const card = document.createElement('div');
    card.className = 'stat';
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    card.append(strong, caption);
    stats.append(card);
  }
  list.replaceChildren();
  const visible = lots.filter(lot => {
    const complete = lot.steps.every(Boolean);
    return (filter.value === 'all' || (filter.value === 'done' ? complete : !complete)) && String(lot.number).includes(search.value.trim());
  });
  empty.hidden = visible.length > 0;
  for (const lot of visible) {
    const card = document.createElement('article');
    card.className = 'lot';
    const head = document.createElement('div');
    head.className = 'lot-head';
    const title = document.createElement('h3');
    title.textContent = `Lote ${lot.number} · nível ${lot.level}`;
    const badge = document.createElement('span');
    badge.className = lot.steps.every(Boolean) ? 'badge done' : 'badge';
    badge.textContent = lot.steps.every(Boolean) ? 'Concluído' : `${lot.steps.filter(Boolean).length}/3 etapas`;
    head.append(title, badge);
    const steps = document.createElement('div');
    steps.className = 'steps';
    labels.forEach((label, index) => {
      const checked = lot.steps[index];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = checked ? 'step checked' : 'step';
      button.disabled = checked ? index < 2 && lot.steps[index + 1] : index > 0 && !lot.steps[index - 1];
      button.setAttribute('aria-pressed', String(checked));
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = checked ? '✓' : '';
      const text = document.createElement('span');
      text.textContent = label;
      button.append(mark, text);
      button.addEventListener('click', () => { lot.steps[index] = !checked; render(); });
      steps.append(button);
    });
    card.append(head, steps);
    list.append(card);
  }
}
filter.addEventListener('change', render);
search.addEventListener('input', render);
document.getElementById('reset').addEventListener('click', () => { lots = seed.map(lot => ({ ...lot, steps: [...lot.steps] })); filter.value = 'all'; search.value = ''; render(); });
render();
