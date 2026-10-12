import { Component, OnInit } from '@angular/core';
import { ConfirmationPointage, Pointage } from '../models/pointage.model';
import { ActivatedRoute } from '@angular/router';
import { PageCodeService } from '../services/page-code.service';

@Component({
    selector: 'app-final-page2',
    imports: [],
    templateUrl: './final-page2.component.html',
    styleUrl: './final-page2.component.scss'
})
export class FinalPage2Component implements OnInit {


  pointage!: Pointage;
  
    constructor(private route: ActivatedRoute, private pagecodeService: PageCodeService) {}
  
  /**
   * Heure et agence du pointage, transmises par l'écran du PIN via l'état de navigation.
   * Absentes sur un rafraîchissement : la page se replie sur son message générique.
   */
  confirmation: ConfirmationPointage | null = null;

    ngOnInit() {
    this.confirmation = (history.state?.confirmation as ConfirmationPointage | undefined) ?? null;
    const codeSecret = this.route.snapshot.paramMap.get('codeSecret');
    if (codeSecret) {
        this.pagecodeService.getPointageById(codeSecret).subscribe(data => {
          this.pointage = data;
        });
      }
  }
  
    

}
