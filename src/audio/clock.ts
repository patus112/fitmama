export class GameClock {
  private origin = 0;
  private elapsed = 0;
  private running = false;

  start(): void {
    this.elapsed = 0;
    this.origin = performance.now();
    this.running = true;
  }

  pause(): void {
    if (!this.running) return;
    this.elapsed = this.now();
    this.running = false;
  }

  resume(): void {
    if (this.running) return;
    this.origin = performance.now() - this.elapsed * 1000;
    this.running = true;
  }

  now(): number {
    if (!this.running) return this.elapsed;
    return (performance.now() - this.origin) / 1000;
  }
}
