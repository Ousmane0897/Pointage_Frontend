import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageCodeService } from '../services/page-code.service';
import { Pointage } from '../models/pointage.model';


@Component({
  selector: 'app-final-page1',
  standalone: true,
  imports: [],
  templateUrl: './final-page1.component.html',
  styleUrl: './final-page1.component.scss'
})
export class FinalPage1Component implements OnInit {


 pointage!: Pointage;

  constructor(private route: ActivatedRoute, private pagecodeService: PageCodeService) {}

  
  ngOnInit() {
    const codeSecret = this.route.snapshot.paramMap.get('codeSecret');
    if (codeSecret) {
        this.pagecodeService.getPointageById(codeSecret).subscribe(data => {
          this.pointage = data;
        });
      }
  }
}

  

