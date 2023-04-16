import {Pipe, PipeTransform} from "@angular/core";
import { takeWhile } from "rxjs";
import { GoogleDriveService } from "src/app/storage/google-drive-service/google-drive.service";
import { StorageService } from "src/app/storage/storage.service";


@Pipe({"name": "imageHandleToDataUrl"})
export class ImageHandleToDataUrlPipe implements PipeTransform {

    constructor(private _storageService: StorageService, private _driveService: GoogleDriveService) {}

    async transform (handle: string): Promise<string|null> {
        let data = await this._storageService.getImageData(handle);
        
        if(!data) {
            let ret: string|null = null;
            if(this._storageService.error$.value) {
                await new Promise((resolve, reject) => {
                    this._driveService.authenticated$.pipe(takeWhile(v => v != true, true)).subscribe(async (auth)=>{
                        if(auth) {
                            ret = await this.transform(handle);
                            resolve(null);
                        }
                    });
                });
            }

            return ret;
        }

        return data;
    }

}
