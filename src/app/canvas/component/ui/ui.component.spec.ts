import { ComponentFixture, TestBed } from '@angular/core/testing';
import { popperVariation, provideTippyConfig, TippyDirective, tooltipVariation } from '@ngneat/helipopper';
import { CanvasModule } from '../../canvas.module';

import { UiComponent } from './ui.component';

describe('UiComponent', () => {
    let component: UiComponent;
    let fixture: ComponentFixture<UiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [UiComponent],
            imports: [CanvasModule, TippyDirective,],
            providers: [
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: {
                            ...tooltipVariation,
                            //theme: 'light',
                            delay: 200,
                        },
                        popper: {
                            ...popperVariation,
                            hideOnClick: false,
                        },
                    }
                }),
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(UiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
