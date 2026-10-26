import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { UNPLAYABLE_SONG } from '../src/domain/songFile';
import { DISCLAIMER } from '../src/domain/zones';

async function openReady(page: Page, url: string) {
  await page.goto(url);
  const shell = page.locator('.onboard, .screen, .game, .results');
  await expect(shell.first()).toBeVisible();
  const onboard = page.getByTestId('onboarding');
  if (!(await onboard.isVisible())) return;
  await page.getByRole('button', { name: 'Hips & bottom' }).click();
  await page.getByRole('button', { name: 'Pelvic floor' }).click();
  await page.getByRole('button', { name: 'Relax & breathe' }).click();
  await page.getByRole('checkbox', { name: DISCLAIMER }).check();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await expect(onboard).toHaveCount(0);
  await page.goto(url);
  await expect(shell.first()).toBeVisible();
  await expect(onboard).toHaveCount(0);
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

test('plan, library, and calm copy are on the main screens', async ({ page }) => {
  await openReady(page, '/fitmama/#/plan');
  await expect(page.getByRole('heading', { name: 'My Plan' })).toBeVisible();
  for (const name of [
    'Body Adaptation',
    'Strength Foundation',
    'Fitness Progression',
    'Performance Breakthrough',
    'Everyday Ease',
  ]) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  await expect(page.getByTestId('day-p1d1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('day-p1d2')).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('[data-testid="today-plan"] .frame-a').first()).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/exercises');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await expect(page.getByText(DISCLAIMER)).toBeVisible();
  await expect(page.getByRole('link', { name: /Glute bridge/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Heel slides/ })).toBeVisible();
  await expect(page.locator('a[href="#/exercises/heel-slides"] .frame-a')).toHaveAttribute('src', /heel-slides-a/);
  await expect(page.locator('a[href="#/exercises/heel-slides"] .frame-b')).toHaveCount(1);
  await expect(page.locator('a[href="#/exercises/glute-bridge"] .frame-a')).toHaveAttribute('src', /glute-bridge-a/);
  await expect(page.getByRole('link', { name: /Leg circles/ })).toBeVisible();
  await page.getByRole('button', { name: 'Neck & chin' }).click();
  await expect(page.getByRole('link', { name: /Chin tuck/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Glute bridge/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'All' }).click();
  await expect(page.locator('a[href="#/exercises/chin-tuck"] .frame-a')).toHaveAttribute('src', /chin-tuck-a/);
  await expect(page.locator('.placeholder-art')).toHaveCount(0);
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/exercises/chin-tuck');
  await expect(page.getByRole('heading', { name: 'Chin tuck' })).toBeVisible();
  await expect(page.locator('.hero-photo .frame-a')).toHaveAttribute('src', /chin-tuck-a/);
  await expect(page.locator('.hero-photo .frame-b')).toHaveCount(1);
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/exercises/glute-bridge');
  await expect(page.getByRole('heading', { name: 'Glute bridge' })).toBeVisible();
  await expect(page.locator('.hero-photo .frame-a')).toHaveAttribute('src', /glute-bridge-a/);
  await expect(page.locator('.detail .character')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Play it as a game' })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await expect(page.getByText('First game')).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/settings');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText(DISCLAIMER)).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Music volume' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute music' })).toBeVisible();
  const songInput = page.getByLabel('Choose an audio file');
  await expect(songInput).toBeAttached();
  const accept = await songInput.getAttribute('accept');
  expect(accept).toContain('audio/*');
  expect(accept).toContain('.mp3');
  expect(accept).toContain('.m4a');
  expect(accept).toContain('.opus');
  expect(accept).toContain('.webm');
  expect(accept).toContain('.mp4');
  expect(accept).toContain('audio/mpeg');
  expect(accept).toContain('audio/mp4');
  expect(accept).toContain('video/mp4');
  await expect(page.getByRole('button', { name: 'Test sound' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset song speed' })).toBeVisible();
  await expect(page.getByTestId('speed-pad')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('test sound and preview unlock audio in the tap', async ({ page }) => {
  await openReady(page, '/fitmama/#/settings');
  await page.getByRole('button', { name: 'Test sound' }).click();
  await expect(page.getByRole('status')).toHaveText('A short tone.');
  const afterTone = await page.evaluate(() => window.__fitmamaAudioLog ?? []);
  expect(afterTone).toContain('resume');
  expect(afterTone).toContain('silent-buffer');
  expect(afterTone).toContain('tone');

  await page.getByRole('button', { name: 'Hear a little' }).click();
  await expect(page.getByRole('status')).toHaveText('A few seconds, quietly.');
  const afterPreview = await page.evaluate(() => window.__fitmamaAudioLog ?? []);
  expect(afterPreview).toContain('synth');
});

test('a chosen song is kept on the phone and a text file is turned away', async ({ page }) => {
  await openReady(page, '/fitmama/#/settings');
  const input = page.getByLabel('Choose an audio file');
  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a song'),
  });
  await expect(page.getByRole('status')).toHaveText(UNPLAYABLE_SONG);
  await expect(page.getByText('notes.txt')).toHaveCount(0);

  await input.setInputFiles('e2e/fixtures/lullaby.wav');
  await expect(page.getByText('lullaby.wav')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText('lullaby.wav')).toBeVisible();
});

test('finishing a day saves the result and unlocks the next day', async ({ page }) => {
  test.setTimeout(45_000);
  await openReady(page, '/fitmama/?fast=1#/plan');
  await page.getByTestId('start-day').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('pause')).toBeVisible();
  await expect(page.getByTestId('tempo-feel')).toHaveText(/Calm|Steady|Brisk/);
  await page.getByTestId('music-button').click();
  const popover = page.getByTestId('volume-popover');
  await expect(popover).toBeVisible();
  const popBox = await popover.boundingBox();
  const cueBox = await page.getByTestId('cue').boundingBox();
  const characterBox = await page.getByTestId('stage-art').boundingBox();
  expect(popBox).toBeTruthy();
  expect(cueBox).toBeTruthy();
  expect(characterBox).toBeTruthy();
  if (popBox && cueBox && characterBox) {
    expect(boxesOverlap(popBox, cueBox)).toBe(false);
    expect(boxesOverlap(popBox, characterBox)).toBe(false);
  }
  await expect(popover).toBeHidden({ timeout: 8_000 });
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
  const score = Number((await page.getByTestId('results-score').innerText()).replaceAll(',', ''));
  expect(score).toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Back to my plan' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByTestId('day-p1d1')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('day-p1d2')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('points')).not.toHaveText('0');
});

test('ending early keeps the next day closed', async ({ page }) => {
  test.setTimeout(30_000);
  await openReady(page, '/fitmama/?fast=1#/plan');
  await page.getByTestId('start-day').click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByTestId('speed-pad')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset song speed' })).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: /Hang in there, only \d+ moves? left/ })).toBeVisible();
  await page.getByRole('button', { name: 'End anyway' }).click();
  await expect(page.getByRole('heading', { name: 'You showed up' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to my plan' }).click();
  await page.reload();
  await expect(page.getByTestId('day-p1d1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('day-p1d2')).toHaveAttribute('data-state', 'locked');
});

async function expectHudFits(page: Page) {
  await expect(page.getByTestId('combo')).toContainText(/Find the groove|Nice and easy|Nice rhythm!|Smooth and slow|In the flow/);
  const boxes = await page.evaluate(() => {
    const ids = ['combo', 'timer', 'live-score', 'pause', 'music-button'];
    return ids.map((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      let clipped = box.left < -1 || box.top < -1 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1;
      let parent = el.parentElement;
      while (parent && !clipped) {
        const style = getComputedStyle(parent);
        const overflow = `${style.overflow}${style.overflowX}${style.overflowY}`;
        if (/hidden|clip/.test(overflow)) {
          const frame = parent.getBoundingClientRect();
          clipped = box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1;
        }
        parent = parent.parentElement;
      }
      const strong = el.querySelector('strong');
      const textCut = strong ? strong.scrollWidth > strong.clientWidth + 1 || strong.scrollHeight > strong.clientHeight + 1 : false;
      return { id, x: box.x, y: box.y, width: box.width, height: box.height, clipped, textCut };
    });
  });
  const visible = boxes.filter((box): box is NonNullable<typeof box> => box !== null && box.width > 0);
  expect(visible.map((box) => box.id)).toEqual(['combo', 'timer', 'live-score', 'pause', 'music-button']);
  const bad = visible.filter((box) => box.clipped || box.textCut);
  expect(bad, JSON.stringify(visible)).toEqual([]);
  for (let index = 0; index < visible.length; index += 1) {
    for (let other = index + 1; other < visible.length; other += 1) {
      const a = visible[index];
      const b = visible[other];
      if (!a || !b) continue;
      expect(boxesOverlap(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }
}

test('game HUDs fit on phone portrait and landscape', async ({ page }) => {
  test.setTimeout(60_000);
  const sizes = [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 844, height: 390 },
  ];
  await openReady(page, '/fitmama/?fast=1#/practice/chin-tuck');
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto('/fitmama/?fast=1#/practice/chin-tuck');
    await expect(page.getByTestId('pause')).toBeVisible();
    await expect(page.getByTestId('hold-ring')).toBeVisible();
    await expectHudFits(page);

    await page.goto('/fitmama/?fast=1#/practice/breath-46');
    await expect(page.getByTestId('pause')).toBeVisible();
    await expect(page.getByTestId('breath-circle')).toBeVisible();
    await expectHudFits(page);

    await page.goto('/fitmama/?fast=1#/plan');
    await page.getByTestId('start-day').click();
    await expect(page.getByTestId('pause')).toBeVisible();
    await expect(page.getByTestId('stage-art')).toBeVisible();
    await expectHudFits(page);
  }
});

test('hold and breath games follow the song', async ({ page }) => {
  test.setTimeout(20_000);
  await openReady(page, '/fitmama/?fast=1#/practice/chin-tuck');
  await expect(page.getByTestId('pause')).toBeVisible();
  await expect(page.getByTestId('hold-ring')).toBeVisible();
  await expect(page.getByTestId('hold-art').locator('.frame-a')).toHaveAttribute('src', /chin-tuck-a/);
  await expect(page.getByTestId('tempo-feel')).toHaveText(/Calm|Steady|Brisk/);
  await expect
    .poll(async () => Number((await page.getByTestId('hold-ring').getAttribute('data-progress')) ?? '0'))
    .toBeGreaterThan(0.2);
  await openReady(page, '/fitmama/?fast=1#/practice/breath-46');
  await expect(page.getByTestId('breath-circle').locator('.frame-a')).toHaveAttribute('src', /breathing-4-6-a/);
  await expect(page.getByTestId('pause')).toBeVisible();
  await expect(page.getByTestId('breath-circle')).toBeVisible();
  await expect(page.getByTestId('cue')).toHaveText(/Inhale|Exhale/);
});

test.describe('screenshots', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

test('capture mobile screens @screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  const out = process.env.SHOT_DIR ?? '/opt/cursor/artifacts';
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/fitmama/#/plan');
  await expect(page.getByTestId('onboarding')).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_onboarding_zones.png` });
  await openReady(page, '/fitmama/#/plan');
  await page.getByTestId('today-plan').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/screenshot_generated_plan.png` });

  await page.goto('/fitmama/#/exercises');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_library.png` });

  await page.goto('/fitmama/#/exercises/chin-tuck');
  await expect(page.getByRole('heading', { name: 'Chin tuck' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_library_detail.png` });

  await page.goto('/fitmama/#/exercises/glute-bridge');
  await expect(page.getByRole('heading', { name: 'Glute bridge' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_exercise_glute_bridge.png` });

  await page.goto('/fitmama/#/settings');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_settings.png` });

  await page.goto('/fitmama/?fast=1#/practice/chin-tuck');
  await expect(page.getByTestId('hold-ring')).toBeVisible();
  await expect(page.getByTestId('pause')).toBeVisible();
  await expect
    .poll(async () => Number((await page.getByTestId('hold-ring').getAttribute('data-progress')) ?? '0'))
    .toBeGreaterThan(0.25);
  await page.screenshot({ path: `${out}/screenshot_hold_mode.png` });

  await page.goto('/fitmama/?fast=1#/practice/breath-46');
  await expect(page.getByTestId('breath-circle')).toBeVisible();
  await expect(page.getByTestId('cue')).toHaveText(/Inhale|Exhale/);
  await page.screenshot({ path: `${out}/screenshot_breath_mode.png` });

  await page.goto('/fitmama/?fast=1#/plan');
  for (let index = 0; index < 2; index += 1) {
    await page.getByTestId('start-day').click();
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
    if (index === 1) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${out}/screenshot_results.png` });
    }
    await page.getByRole('link', { name: 'Back to my plan' }).click();
    await expect(page.getByRole('heading', { name: 'My Plan' })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Bridge Groove' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_plan.png` });

  await page.evaluate(() => sessionStorage.removeItem('fitmama-fast'));
  await page.goto('/fitmama/#/plan');
  await page.getByTestId('start-day').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('pause')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('volume-popover')).toHaveCount(0);
  await expect(page.getByTestId('cue')).toBeVisible();
  await expect
    .poll(
      async () => {
        const text = (await page.getByTestId('timer').innerText()).trim();
        const match = /(\d+):(\d+)/.exec(text);
        if (!match?.[1] || !match[2]) return 9999;
        return Number(match[1]) * 60 + Number(match[2]);
      },
      { timeout: 120_000 },
    )
    .toBeLessThan(136);
  await page.screenshot({ path: `${out}/screenshot_game_cue.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fitmama/#/progress');
  await expect(page.getByTestId('progress-streak')).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_progress.png` });
});

test('capture the game with the cue clear @screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  const out = process.env.SHOT_DIR ?? '/opt/cursor/artifacts';
  await page.setViewportSize({ width: 844, height: 390 });
  await openReady(page, '/fitmama/#/plan');
  await page.getByTestId('start-day').click();
  await expect(page.getByTestId('speed-pad')).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_game_countdown.png` });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('pause')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('volume-popover')).toHaveCount(0);
  await expect(page.getByTestId('cue')).toBeVisible();
  await expect
    .poll(
      async () => {
        const text = (await page.getByTestId('timer').innerText()).trim();
        const match = /(\d+):(\d+)/.exec(text);
        if (!match?.[1] || !match[2]) return 9999;
        return Number(match[1]) * 60 + Number(match[2]);
      },
      { timeout: 90_000 },
    )
    .toBeLessThan(168);
  await page.screenshot({ path: `${out}/screenshot_game_cue.png` });
  await page.getByTestId('pause').click();
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await expect(page.getByTestId('speed-pad')).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_game_paused.png` });
});
});
