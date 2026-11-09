import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastContenedor } from './shared/toast/toast';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContenedor],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly menuMovilAbierto = signal<boolean>(false);

  toggleMenuMovil(): void {
    this.menuMovilAbierto.update(v => !v);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }
}
