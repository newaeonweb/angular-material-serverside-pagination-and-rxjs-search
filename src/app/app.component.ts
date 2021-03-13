import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  AfterViewInit
} from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";

import { HttpClient } from "@angular/common/http";
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DialogComponent } from "./dialog/dialog.component";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";

export interface Origin {
  [key: string]: any;
}

export interface Location {
  [key: string]: any;
}

export interface Character {
  id: number;
  name: string;
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: Origin;
  location: Location;
  image: string;
  episode: any[];
  url: string;
  created: Date;
}

export interface HttpRequest {
  info: {
    count: number;
    pages: number;
    next: string;
    prev: string;
  };
  results: Character[];
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  characters$: Observable<any>;
  characterDataSource: MatTableDataSource<Character[]>;
  characterDatabase = new HttpDatabase(this.httpClient);
  searchTerm$ = new BehaviorSubject('');
  status = "";
  resultsLength = 0;

  filterFormGroup: FormGroup;
  searchField = new FormControl("");

  dialogRef: MatDialogRef<DialogComponent>;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private httpClient: HttpClient,
    public dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.characterDatabase
      .search(this.searchTerm$)
      .subscribe((response: any) => {
        this.resultsLength = response.info.count;
        this.characterDataSource = new MatTableDataSource(response.results);
        this.characterDataSource.paginator = this.paginator;
        this.characters$ = this.characterDataSource.connect();
      });

    this.filterFormGroup = this.fb.group({});
  }
  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.characterDatabase
        .getCharacters("", "", this.paginator.pageIndex)
        .subscribe((response: any) => {
          this.characterDataSource = new MatTableDataSource(response.results);
          this.resultsLength = response.info.count;
          // this.characterDataSource.paginator = this.paginator;
          this.characters$ = this.characterDataSource.connect();
        });
    });
  }

  ngOnInit() {
    this.characterDatabase.getCharacters().subscribe((response: any) => {
      this.characterDataSource = new MatTableDataSource(response.results);
      this.resultsLength = response.info.count;
      this.characterDataSource.paginator = this.paginator;
      this.characters$ = this.characterDataSource.connect();
    });
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    if (this.characterDataSource) {
      this.characterDataSource.disconnect();
    }
  }

  openDialog(char) {
    this.dialogRef = this.dialog.open(DialogComponent, {
      data: {
        c: char
      }
    });

    this.dialogRef.afterClosed().subscribe((res: string) => {
      console.log(res)
      if (!res) {
        return;
      }
      this.searchField.patchValue(res);
      this.searchTerm$.next(res);
    });
  }

  applyFilter() {
    const filterValue = this.status;
    this.characterDataSource.filter = filterValue.trim().toLowerCase();
    // this.characterDataSource.paginator = this.paginator;
    // if (this.characterDataSource.paginator) {
    //   this.characterDataSource.paginator.firstPage();
    // }
  }

  setStatusColor(status: string) {
    if (status === "Alive") {
      return "green";
    }
    if (status === "Dead") {
      return "red";
    }
  }
}

export class HttpDatabase {
  constructor(private _httpClient: HttpClient) {}

  search(terms: Observable<string>) {
    return terms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => this.getCharacters(term))
    )

  }

  getCharacters(
    name: string = "",
    status: string = "",
    page: number = 0
  ): Observable<HttpRequest> {
    const href = "https://rickandmortyapi.com/api/character";
    const requestUrl = `${href}?name=${name}&status=${status}&page=${page + 1}`;

    return this._httpClient.get<HttpRequest>(requestUrl);
  }
}