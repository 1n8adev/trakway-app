import { AfterViewInit, Component, ElementRef, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type Command = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat';

// Small rich-text editor (contenteditable + execCommand) for the product HTML fields.
// The API sanitises the HTML on save (utils/html.js), so this only needs to produce basic markup.
// Works with formControlName / ngModel; empty content is reported as null.
@Component({
  selector: 'app-rich-editor',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichEditor), multi: true }],
  template: `
    <div
      class="overflow-hidden rounded-md border bg-white transition focus-within:ring-2"
      [class]="invalid() ? 'border-red-400 focus-within:ring-red-500/10' : 'border-gray-300 focus-within:border-brand-600 focus-within:ring-brand-600/15'"
    >
      <div class="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5" role="toolbar" aria-label="Formatting">
        @for (b of buttons; track b.label) {
          @if (b.divider) {
            <span class="mx-1 h-5 w-px bg-gray-300"></span>
          }
          <button
            type="button"
            (mousedown)="$event.preventDefault()"
            (click)="b.run()"
            [disabled]="disabled()"
            class="flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-[14px] text-gray-600 transition hover:bg-white hover:text-brand-500 disabled:opacity-40"
            [title]="b.label"
            [attr.aria-label]="b.label"
            [innerHTML]="b.icon"
          ></button>
        }
      </div>
      <div
        #area
        class="rich-content min-h-[var(--editor-min,160px)] px-4 py-3 text-[15px] text-gray-800 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
        [style.--editor-min]="minHeight()"
        [attr.contenteditable]="!disabled()"
        [attr.data-placeholder]="placeholder()"
        [attr.aria-label]="label() || placeholder()"
        role="textbox"
        aria-multiline="true"
        (input)="onInput()"
        (blur)="onTouched()"
      ></div>
    </div>
  `,
})
export class RichEditor implements ControlValueAccessor, AfterViewInit {
  readonly placeholder = input('');
  readonly label = input('');
  readonly minHeight = input('160px');
  readonly invalid = input(false);

  protected readonly disabled = signal(false);
  private readonly sanitizer = inject(DomSanitizer);
  // Optional: forms call writeValue() before the view exists.
  private readonly areaRef = viewChild<ElementRef<HTMLDivElement>>('area');
  private pending: string | null = null;
  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  // Icons are static markup defined in this file (never user input), so trusting them is safe;
  // without it Angular's sanitiser would strip the SVG.
  protected readonly buttons = [
    { label: 'Bold', icon: this.trusted('<b>B</b>'), run: () => this.exec('bold') },
    { label: 'Italic', icon: this.trusted('<i class="font-serif">I</i>'), run: () => this.exec('italic') },
    { label: 'Underline', icon: this.trusted('<u>U</u>'), run: () => this.exec('underline') },
    { label: 'Heading', icon: this.trusted('<span class="font-semibold">H</span>'), run: () => this.block('h3'), divider: true },
    { label: 'Paragraph', icon: this.trusted('<span>¶</span>'), run: () => this.block('p') },
    { label: 'Bulleted list', icon: this.trusted(this.svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>')), run: () => this.exec('insertUnorderedList'), divider: true },
    { label: 'Numbered list', icon: this.trusted(this.svg('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4v4M3 8h2M3 12.5a1.5 1.5 0 1 1 2 1.4L3 16h3"/>')), run: () => this.exec('insertOrderedList') },
    { label: 'Link', icon: this.trusted(this.svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')), run: () => this.link(), divider: true },
    { label: 'Clear formatting', icon: this.trusted(this.svg('<path d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5"/>')), run: () => this.exec('removeFormat') },
  ];

  // Applies a value that arrived before the editable area existed. Reactive forms usually call
  // writeValue() once the area already exists, so with nothing pending the content is left as is.
  ngAfterViewInit(): void {
    if (this.pending === null) return;
    this.el().innerHTML = this.pending;
    this.pending = null;
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    const el = this.areaRef()?.nativeElement;
    if (el) {
      if (el.innerHTML !== html) el.innerHTML = html;
    } else {
      this.pending = html;
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(): void {
    const el = this.el();
    // An editor the user has emptied often still holds "<br>" or "<p><br></p>".
    const empty = !el.textContent?.trim() && !el.querySelector('img, table');
    if (empty && el.innerHTML !== '') el.innerHTML = '';
    this.onChange(empty ? null : el.innerHTML);
  }

  private exec(command: Command): void {
    this.el().focus();
    document.execCommand(command, false);
    this.onInput();
  }

  private block(tag: 'h3' | 'p'): void {
    this.el().focus();
    document.execCommand('formatBlock', false, tag);
    this.onInput();
  }

  private link(): void {
    const url = window.prompt('Link URL (https://…)', 'https://');
    if (!url || url === 'https://') return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      window.alert('Use a link starting with https://, http://, mailto: or tel:');
      return;
    }
    this.el().focus();
    document.execCommand('createLink', false, url);
    this.onInput();
  }

  private el(): HTMLDivElement {
    return this.areaRef()!.nativeElement;
  }

  private trusted(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private svg(paths: string): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }
}
