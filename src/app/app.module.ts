import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { provideDialogConfig } from '@ngneat/dialog';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CanvasModule } from './canvas/canvas.module';
import { StorageModule } from './storage/storage.module';
import { provideTippyConfig, tooltipVariation, popperVariation } from '@ngneat/helipopper';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        CanvasModule,
        StorageModule,
        FormsModule,
        PickerModule,
    ],
    providers: [
        provideDialogConfig({
            sizes: {
                storagePopup: {
                    width: 800,
                    height: 600,
                },
                alertPopup: {
                    width: 400,
                    minHeight: 200,
                }
            },
        }),
        provideTippyConfig({
            defaultVariation: 'tooltip',
            variations: {
                tooltip: {
                    ...tooltipVariation,
                    theme: 'light',
                    delay: 200,
                    arrow: true,
                },
                popper: {
                    ...popperVariation,
                    arrow: false,
                    trigger: '',
                    hideOnClick: false,
                    offset: [0, 15],
                },
                shouldDrag: {
                    ...tooltipVariation,
                    arrow: true,
                    trigger: 'click',
                    placement: 'right',
                    delay: 0,
                    duration: 100,
                    hideOnClick: true,
                    onShown: (instance) => {
                        setTimeout(() => {
                          instance.hide();
                        }, 600);
                    },
                },
            }
        })
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
