import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotfoundComponent } from './demo/components/notfound/notfound.component';
import { AppLayoutComponent } from "./layout/app.layout.component";
import { MapCommonComponent } from "./map-common/map-common.component"; // Import the standalone component directly

const routes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    {
        path: 'auth',
        loadChildren: () => import('./demo/components/auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: '', component: AppLayoutComponent,
        children: [
            { path: 'uikit', loadChildren: () => import('./demo/components/uikit/uikit.module').then(m => m.UIkitModule) },
            { path: 'utilities', loadChildren: () => import('./demo/components/utilities/utilities.module').then(m => m.UtilitiesModule) },
            { path: 'documentation', loadChildren: () => import('./demo/components/documentation/documentation.module').then(m => m.DocumentationModule) },
            { path: 'blocks', loadChildren: () => import('./demo/components/primeblocks/primeblocks.module').then(m => m.PrimeBlocksModule) },
            { path: 'pages', loadChildren: () => import('./demo/components/pages/pages.module').then(m => m.PagesModule) },    
            { path: 'dashboard', loadChildren: () => import('./demo/components/dashboard/dashboard.module').then(m => m.DashboardModule) },
            { path: 'map-common', component: MapCommonComponent }, // Use component instead of loadChildren
            { path: 'list/:id', loadChildren: () => import('./demo/components/uikit/list/user-uploaded-books.module').then(m => m.UserUploadedBooksModule) },

        ]
    },
    { path: 'add-user-info', loadChildren: () => import('./demo/components/add-user-info/add-user-info.module').then(m => m.AddUserInfoModule) },
    { path: 'notfound', component: NotfoundComponent },
    { path: '**', redirectTo: '/notfound' },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled', onSameUrlNavigation: 'reload' })
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
