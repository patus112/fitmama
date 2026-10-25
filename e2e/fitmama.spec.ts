import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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
  await page.goto('/fitmama/#/plan');
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
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/exercises');
  await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Glute bridge/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Heel slides/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Leg circles/ })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/exercises/glute-bridge');
  await expect(page.getByRole('heading', { name: 'Glute bridge' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play it as a game' })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await expect(page.getByText('First game')).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/fitmama/#/settings');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Music volume' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute music' })).toBeVisible();
  await expect(page.getByLabel('Choose an audio file')).toBeAttached();
  await expect(page.getByRole('button', { name: 'Test sound' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('test sound and preview unlock audio in the tap', async ({ page }) => {
  await page.goto('/fitmama/#/settings');
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

test('finishing a day saves the result and unlocks the next day', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/fitmama/?fast=1#/plan');
  await page.getByTestId('start-day').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('pause')).toBeVisible();
  await page.getByTestId('music-button').click();
  const popover = page.getByTestId('volume-popover');
  await expect(popover).toBeVisible();
  const popBox = await popover.boundingBox();
  const cueBox = await page.getByTestId('cue').boundingBox();
  const characterBox = await page.locator('.character').boundingBox();
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
  await page.goto('/fitmama/?fast=1#/plan');
  await page.getByTestId('start-day').click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: /Hang in there, only \d+ moves? left/ })).toBeVisible();
  await page.getByRole('button', { name: 'End anyway' }).click();
  await expect(page.getByRole('heading', { name: 'You showed up' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to my plan' }).click();
  await page.reload();
  await expect(page.getByTestId('day-p1d1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('day-p1d2')).toHaveAttribute('data-state', 'locked');
});

test.describe('screenshots', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

test('capture mobile screens @screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  const out = process.env.SHOT_DIR ?? '/opt/cursor/artifacts';
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/fitmama/#/exercises/glute-bridge');
  await expect(page.getByRole('heading', { name: 'Glute bridge' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_exercise_glute_bridge.png` });

  await page.goto('/fitmama/#/settings');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_settings.png` });

  await page.goto('/fitmama/?fast=1#/plan');
  for (let index = 0; index < 2; index += 1) {
    await page.getByTestId('start-day').click();
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
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

  await expect(page.getByTestId('results')).toBeVisible({ timeout: 240_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/screenshot_results.png` });

  await page.goto('/fitmama/#/progress');
  await expect(page.getByTestId('progress-streak')).toBeVisible();
  await page.screenshot({ path: `${out}/screenshot_progress.png` });
});

test('capture the game with the cue clear @screenshots', async ({ page }) => {
  test.setTimeout(90_000);
  const out = process.env.SHOT_DIR ?? '/opt/cursor/artifacts';
  await page.setViewportSize({ width: 844, height: 390 });
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
      { timeout: 60_000 },
    )
    .toBeLessThan(168);
  await page.screenshot({ path: `${out}/screenshot_game_cue.png` });
});
});
