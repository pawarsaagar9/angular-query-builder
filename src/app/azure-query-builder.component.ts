// Azure DevOps-like Query Builder (Angular single-file example)
// File: azure-devops-query-builder-angular.component.ts
// This single-file example contains: interfaces, component TS, template and styles.
// Drop into an Angular project (v12+) and adapt to your services/state management.

import { Component } from '@angular/core';

// --- Models ---
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'tags';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  operators: string[];
}

export interface Clause {
  id: string;
  field?: string;
  operator?: string;
  value?: any;
}

export interface Group {
  id: string;
  logic: 'AND' | 'OR';
  clauses: Array<Clause | Group>;
}

// --- Helper utils ---
const uid = (prefix = '') => prefix + Math.random().toString(36).substr(2, 9);

const DEFAULT_FIELDS: Field[] = [
  { key: 'Title', label: 'Title', type: 'string', operators: ['contains', 'equals', 'not equals', 'startsWith'] },
  { key: 'State', label: 'State', type: 'string', operators: ['equals', 'not equals'] },
  { key: 'AssignedTo', label: 'Assigned To', type: 'string', operators: ['equals', 'not equals'] },
  { key: 'Priority', label: 'Priority', type: 'number', operators: ['=', '!=', '<', '>'] },
  { key: 'CreatedDate', label: 'Created Date', type: 'date', operators: ['before', 'after', 'on'] },
  { key: 'IsActive', label: 'Is Active', type: 'boolean', operators: ['is', 'is not'] },
];

// --- Component ---
@Component({
  selector: 'app-query-builder',
  template: `
  <div class="qb-root">
    <h3>Query Builder (Azure DevOps style)</h3>
    <div class="group-container">
      <ng-container *ngTemplateOutlet="groupTpl; context: {group: rootGroup}"></ng-container>
    </div>

    <div class="actions">
      <button (click)="printJson()">Print JSON</button>
      <button (click)="clear()">Clear</button>
    </div>

    <ng-template #groupTpl let-group="group">
      <div class="group">
        <div class="group-header">
          <label>Match</label>
          <select [(ngModel)]="group.logic">
            <option value="AND">All (AND)</option>
            <option value="OR">Any (OR)</option>
          </select>

          <div class="group-controls">
            <button (click)="addClause(group)">+ Clause</button>
            <button (click)="addGroup(group)">+ Group</button>
            <button *ngIf="group !== rootGroup" (click)="removeGroup(group)">Remove Group</button>
          </div>
        </div>

        <div class="group-body">
          <div *ngFor="let item of group.clauses; let i = index" class="clause-or-group">
            <!-- Clause -->
            <div *ngIf="isClause(item)" class="clause">
              <select [(ngModel)]="(item as Clause).field" (ngModelChange)="onFieldChange(item as Clause)">
                <option [ngValue]="undefined">-- select field --</option>
                <option *ngFor="let f of fields" [value]="f.key">{{f.label}}</option>
              </select>

              <select [(ngModel)]="(item as Clause).operator">
                <option [ngValue]="undefined">-- op --</option>
                <option *ngFor="let op of operatorsForClause(item as Clause)" [value]="op">{{op}}</option>
              </select>

              <ng-container [ngSwitch]="valueInputType(item as Clause)">
                <input *ngSwitchCase="'string'" type="text" [(ngModel)]="(item as Clause).value" />
                <input *ngSwitchCase="'number'" type="number" [(ngModel)]="(item as Clause).value" />
                <input *ngSwitchCase="'date'" type="date" [(ngModel)]="(item as Clause).value" />
                <select *ngSwitchCase="'boolean'" [(ngModel)]="(item as Clause).value">
                  <option [ngValue]="true">True</option>
                  <option [ngValue]="false">False</option>
                </select>
                <input *ngSwitchDefault type="text" [(ngModel)]="(item as Clause).value" />
              </ng-container>

              <button (click)="removeClause(group, i)">x</button>
            </div>

            <!-- Nested Group -->
            <div *ngIf="!isClause(item)" class="nested-group">
              <ng-container *ngTemplateOutlet="groupTpl; context: {group: item}"></ng-container>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  </div>
  `,
  styles: [`
    .qb-root { font-family: Arial, Helvetica, sans-serif; max-width: 900px; margin: 12px; }
    .group { border: 1px solid #ddd; padding: 8px; border-radius: 6px; margin-top: 8px; }
    .group-header { display:flex; align-items:center; gap:8px; }
    .group-controls { margin-left:auto; display:flex; gap:6px; }
    .group-body { margin-top:8px; padding-left: 8px; }
    .clause { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
    .clause select, .clause input { padding:4px 6px; }
    .nested-group { margin-left:8px; }
    .actions { margin-top:12px; display:flex; gap:8px; }
  `]
})
export class AzureQueryBuilderComponent {
  fields: Field[] = DEFAULT_FIELDS;

  rootGroup: Group = this.newGroup();

  constructor() {
    // seed with an empty clause
    this.addClause(this.rootGroup);
  }

  // Factory helpers
  newGroup(): Group {
    return { id: uid('g_'), logic: 'AND', clauses: [] };
  }
  newClause(): Clause {
    return { id: uid('c_'), field: undefined, operator: undefined, value: '' };
  }

  // UI actions
  addClause(group: Group) {
    group.clauses.push(this.newClause());
  }

  removeClause(group: Group, index: number) {
    group.clauses.splice(index, 1);
  }

  addGroup(parent: Group) {
    parent.clauses.push(this.newGroup());
  }

  removeGroup(groupToRemove: Group, parentGroup: Group = this.rootGroup) {
    // recursive removal - find and remove any group in parent
    const idx = parentGroup.clauses.findIndex(c => !this.isClause(c) && (c as Group).id === groupToRemove.id);
    if (idx !== -1) { parentGroup.clauses.splice(idx, 1); return; }
    for (const item of parentGroup.clauses) {
      if (!this.isClause(item)) this.removeGroup(groupToRemove, item as Group);
    }
  }

  isClause(item: Clause | Group): item is Clause {
    return (item as Clause).id?.startsWith('c_');
  }

  onFieldChange(clause: Clause) {
    clause.operator = undefined;
    clause.value = '';
  }

  operatorsForClause(clause: Clause): string[] {
    const f = this.fields.find(x => x.key === clause.field);
    return f ? f.operators : [];
  }

  valueInputType(clause: Clause): FieldType | 'string' {
    const f = this.fields.find(x => x.key === clause.field);
    return f ? f.type : 'string';
  }

  // Serialize - turn the Group into a query model (you can transform to WIQL or other DSL)
  serializeGroup(group: Group): any {
    const parts = group.clauses.map(item => {
      if (this.isClause(item)) {
        const c = item as Clause;
        return { type: 'clause', field: c.field, operator: c.operator, value: c.value };
      } else {
        return { type: 'group', logic: (item as Group).logic, group: this.serializeGroup(item as Group) };
      }
    });
    return { logic: group.logic, parts };
  }

  printJson() {
    console.log(JSON.stringify(this.serializeGroup(this.rootGroup), null, 2));
    alert('Query JSON printed to console');
  }

  clear() {
    this.rootGroup = this.newGroup();
    this.addClause(this.rootGroup);
  }
}

/*
Notes & next steps:
- Replace in-memory DEFAULT_FIELDS with a service call to fetch project fields.
- Add validation: show warnings when field/operator/value combinations are invalid.
- Support drag-drop reordering of clauses and groups.
- Map serializeGroup to Azure DevOps WIQL or your backend query format.
- For large UIs, break into smaller child components: clause-row, group-block, toolbar.
- Add keyboard accessibility and ARIA attributes for production.
*/

