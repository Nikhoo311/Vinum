import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsPage } from './tabs.page';
import { AuthGuard } from '../guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        canActivate: [AuthGuard],
        loadChildren: () => import("../home/home.module").then(m => m.HomePageModule),
      },
      {
        path: 'cave',
        canActivate: [AuthGuard],
        loadChildren: () => import("../cave/cave.module").then(m => m.CavePageModule),
      },
      {
        path: 'catalogue',
        canActivate: [AuthGuard],
        loadChildren: () => import("../home/home.module").then(m => m.HomePageModule),
      },
      {
        path: 'settings',
        canActivate: [AuthGuard],
        loadChildren: () => import("../settings/settings.module").then(m => m.SettingsPageModule),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
