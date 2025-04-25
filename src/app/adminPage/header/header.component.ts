import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit{

  sentences: string[] = [
    'Cleanic Sénégal',
    'Le reflet de votre image de marque',
    "Plus de 10 ans d'expérience"
    
  ];

  currentIndex :number = 0;
  currentSentence :string = '';

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.currentSentence = this.sentences[0];

    this.zone.runOutsideAngular(() => {
      setInterval(() => {
        this.zone.run(() => {
          this.currentIndex = (this.currentIndex + 1) % this.sentences.length;
          this.currentSentence = this.sentences[this.currentIndex];
        });
      }, 3000);
    });
  }

}
