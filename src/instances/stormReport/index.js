// stormReport — "What just happened?" card after a particle storm (an instance overlay).
// Shows the real event behind the storm (DONKI flare + particles, RadLab CRaTER strength),
// how the player did, and the science. Data is labelled honestly: replay vs live, "based on".
import '../electrolysis/style.css';
import '../waterWalls/style.css';
import { IC, voltBot, starIcon } from '../electrolysis/icons.js';
import { RADIATION } from '../../config/gameplay.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
};

/** ctx: { storm, summary, sunLabel, live, voice } */
export function createStormReportInstance({ root, ctx, done }) {
  const { storm, summary } = ctx;
  const dose = Math.round(summary.dose);
  const safe = dose < 100;
  const sheltered = summary.shelteredShare >= 0.8;
  const stars = !safe ? 1 : sheltered && dose < 50 ? 3 : 2;
  const lead = storm.realLeadHours;
  const leadText =
    lead == null
      ? ''
      : lead < 1
        ? `In real life the particles arrived only <b>${Math.round(lead * 60)} minutes</b> after the flare${storm.extraWarning ? ' — the game gave you extra time.' : '.'}`
        : `In real life the particles arrived about <b>${lead.toFixed(1)} hours</b> after the flare${storm.extraWarning ? ' — the game gave you extra time.' : '.'}`;
  const headline = !safe ? 'That storm was too much!' : sheltered ? 'You stayed safe in the shelter!' : 'Storm over — you made it.';
  const mood = !safe ? 'think' : sheltered ? 'cheer' : 'happy';

  const el = document.createElement('div');
  el.className = 'ez';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'sr-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="sr-title" class="ez-title">${IC.heat}<span>What just happened?</span></h2>
        <span class="ez-medal-slot"><span class="sr-tag">${ctx.live ? 'Live data' : 'Replay of real data'}</span></span>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body">
        <div class="ez-say">${voltBot(mood)}<div class="ez-bubble">
          <h3 class="ez-h3">${headline}</h3>
          <p>Storm dose: <b>${dose}%</b> of the safe limit${sheltered ? ', mostly in the shelter.' : '.'}</p>
        </div></div>
        <div class="ez-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starIcon(n <= stars)).join('')}</div>
        <ul class="sr-facts">
          ${
            storm.flare
              ? `<li>${IC.heat}<span><b>A real ${esc(storm.flare.classType)} solar flare</b> went off on the Sun on ${esc(fmtDate(storm.flare.peak))}${storm.flare.region ? ` (sunspot region ${esc(storm.flare.region)})` : ''}. Its light reached us in about 8 minutes.</span></li>`
              : ''
          }
          <li>${IC.oxygen}<span><b>Then fast particles came</b> — a solar particle event, first detected ${esc(fmtDate(storm.arrival))}. ${leadText}</span></li>
          ${
            storm.ratio
              ? `<li>${IC.power}<span><b>NASA’s LRO spacecraft, orbiting the Moon, measured about ${Math.round(storm.ratio)}× more radiation</b> than on quiet days (CRaTER instrument, daily average).</span></li>`
              : ''
          }
          <li>${IC.water}<span><b>Why the shelter works:</b> mass between you and the Sun stops particles. Water, food and supplies all count — Orion crews build a shelter from stowage bags. The Moon has no thick air or global magnetic field to protect you.</span></li>
        </ul>
        <p class="sr-source">${esc(ctx.sunLabel)}. Based on NASA DONKI (preliminary research data) — <a href="https://ccmc.gsfc.nasa.gov/donki/" target="_blank" rel="noopener">ccmc.gsfc.nasa.gov/donki</a>${
          storm.ratio ? ' · Dose rates: NASA OSDR RadLab (CRaTER on LRO) — <a href="https://visualization.osdr.nasa.gov/radlab/gui/overview/" target="_blank" rel="noopener">RadLab</a>' : ''
        }. Real particle storms can last hours to days; here one lasts ${RADIATION.STORM_GAME_HOURS} game hours.</p>
        <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>Back to base</span></button></div>
      </div>
    </div>`;
  root.appendChild(el);
  el.querySelector('[data-back]').addEventListener('click', () => done({ completed: true, stars }));
  el.querySelector('[data-back]').focus();
  const flareWords = storm.flare ? `A real ${storm.flare.classType} solar flare sent fast particles toward the Moon.` : 'Fast particles from the Sun reached the Moon.';
  ctx.voice?.speak(`${headline.replace('—', ',')} ${flareWords} Mass between you and the Sun stops them.`);

  return {
    onKey(e) {
      if (e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        done({ completed: true, stars });
      }
    },
    destroy() {
      ctx.voice?.stop();
    },
  };
}
