import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
// import { SupabaseService } from './demo/service/supabase.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

    constructor(private primengConfig: PrimeNGConfig) { }
    data: any;

    ngOnInit() {
        this.primengConfig.ripple = true;
        // this.fetchData();
    }

    // async fetchData() {
    //   this.data = await this.supabaseService.getData('Books');
    //   console.log(this.data);
    // }
}
