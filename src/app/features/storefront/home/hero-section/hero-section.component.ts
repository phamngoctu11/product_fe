import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface HeroSlide {
  src: string;
  alt: string;
  caption: string;
}

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  readonly slides: HeroSlide[] = [
    {
      src: '/images/storefront/hero-vases-garden.jpg',
      alt: 'Bình gốm thủ công giữa khu vườn phủ dây leo',
      caption: 'Đất · Men · Lửa',
    },
    {
      src: '/images/storefront/hero-handmade-cups.jpg',
      alt: 'Bộ chén và bát gốm men tự nhiên trên bàn xưởng',
      caption: 'Men mộc tự nhiên',
    },
    {
      src: '/images/storefront/hero-potter-hands.jpg',
      alt: 'Đôi tay nghệ nhân đang tạo hoa văn trên bát đất',
      caption: 'Tạo hình bằng tay',
    },
    {
      src: '/images/storefront/hero-handpainted-plates.jpg',
      alt: 'Bộ đĩa gốm vẽ họa tiết lá xanh thủ công',
      caption: 'Vẽ tay từng nét',
    },
  ];

  activeSlide = 0;
  autoplayEnabled = true;

  private carouselTimer?: number;

  get slideNumber(): string {
    return String(this.activeSlide + 1).padStart(2, '0');
  }

  get slideCount(): string {
    return String(this.slides.length).padStart(2, '0');
  }

  ngOnInit(): void {
    this.carouselTimer = window.setInterval(() => {
      if (this.autoplayEnabled && !document.hidden) {
        this.showSlide((this.activeSlide + 1) % this.slides.length);
      }
    }, 5500);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer !== undefined) {
      window.clearInterval(this.carouselTimer);
    }
  }

  showSlide(index: number): void {
    this.activeSlide = (index + this.slides.length) % this.slides.length;
  }

  toggleAutoplay(): void {
    this.autoplayEnabled = !this.autoplayEnabled;
  }
}

