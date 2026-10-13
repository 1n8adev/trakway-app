import { Component, input, output, signal } from '@angular/core';

// One image slot: drop zone / preview with Change. The parent validates the file and owns the state.
@Component({
  selector: 'app-photo-picker',
  templateUrl: './photo-picker.html',
})
export class PhotoPicker {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly preview = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly hint = input<string>('');
  readonly loading = input(false);
  readonly picked = output<File>();

  protected readonly dragging = signal(false);

  protected onSelected(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (file) this.picked.emit(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.picked.emit(file);
  }
}
