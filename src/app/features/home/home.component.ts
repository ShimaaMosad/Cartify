import { Component } from '@angular/core';
import { HeroSlideComponent } from './components/hero-slide/hero-slide.component';

@Component({
  imports: [HeroSlideComponent],
  selector: 'app-home',
  styleUrl: './home.component.css',
  templateUrl: './home.component.html',
})
export class HomeComponent {}
