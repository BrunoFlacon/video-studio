export class BatchQueue {
  constructor() {
    this.queue = [];
  }

  add(job) {
    this.queue.push(job);
  }

  async run() {
    const form = new FormData();
    form.append('jobs', JSON.stringify(this.queue));

    const res = await fetch('/api/batch-export.php', {
      method: 'POST',
      body: form
    });

    return await res.json();
  }
}
