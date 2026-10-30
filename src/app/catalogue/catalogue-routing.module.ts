import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CataloguePage } from './catalogue.page';
import { MyProposalsPage } from './my-proposals.page';

const routes: Routes = [
  { path: '', component: CataloguePage },
  { path: 'my-proposals', component: MyProposalsPage },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class CataloguePageRoutingModule {}
