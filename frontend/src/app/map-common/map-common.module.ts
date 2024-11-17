import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // Add this if not already imported
import { FormsModule } from '@angular/forms';  // <-- Import FormsModule
import { MapCommonComponent } from './map-common.component';

@NgModule({
    declarations: [MapCommonComponent],
    imports: [
        CommonModule,   
        FormsModule  
    ],
    exports: [MapCommonComponent],
})
export class MapCommonModule { }

