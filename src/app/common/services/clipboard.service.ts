import { Injectable } from '@angular/core';
import { Size2 } from '../math';
import * as clipboard from "clipboard-polyfill";

export type PasteResult = {
    text?: string,
    html?: string,
    image?: { data: string, size: Size2 },
}

@Injectable({
    providedIn: 'root'
})
export class ClipboardService {

    constructor() {
        if ('read' in clipboard) {
            navigator.permissions.query({ name: "clipboard-read" as any }).then((result) => {
                if (result.state === "granted" || result.state === "prompt") {
                    
                }
            });
        } else {
            //console.warn('No clipboard service');
        }
    }

    async copyText(text?: string, html?: string) {
        let tx = {};
        let ht = {};

        if (text) {
            tx = {
                ['text/plain']: new Blob([text], { type: 'text/plain' })
            };
        }

        if (html) {
            ht = {
                ['text/html']: new Blob([html], { type: 'text/html' })
            };
        }

        const clipboardItem = new ClipboardItem({ ...tx, ...ht });
        await clipboard.write([clipboardItem]).then(
            (evt) => {

            },
            (evt) => {
                console.error('clipboard write failure', evt);
            }
        );
    }

    async paste(event: any): Promise<PasteResult> {

        //console.log('plain', event.clipboardData.getData('text/plain'));
        //console.log('html', event.clipboardData.getData('text/html'));
        //console.log('png', event.clipboardData.getData('image/png'));
        //console.log('jpg', event.clipboardData.getData('image/jpg'));

        if (!('read' in clipboard)) throw new Error('paste unsuported');

        let data = await clipboard.read();
        let result: PasteResult = {};

        for (const clipboardItem of data) {
            let isImage = clipboardItem.types.indexOf('image/png') != -1;
            let isHtml = clipboardItem.types.indexOf('text/html') != -1;
            let isText = clipboardItem.types.indexOf('text/plain') != -1;

            if (isImage) {
                let item = await clipboardItem.getType('image/png');

                await new Promise((resolve, reject) => {
                    var fr = new FileReader();
                    fr.onload = async (e) => {
                        await new Promise((resolve, reject) => {
                            let img = new Image();
                            img.src = e?.target?.result as string;
                            
                            img.onload = () => {
                                resolve(img);
                            }
                            // assign image data and dimensions to result object
                            //result.image = img.src;
                            //result.width = img.naturalWidth;
                            //result.height = img.naturalHeight;
                        }).then((img: any) => {
                            result.image = {
                                data: e?.target?.result as string,
                                size: new Size2(img.naturalWidth, img.naturalHeight),
                            }   
                            resolve(null);
                        });
                    };
                    fr.onerror = reject;
                    fr.readAsDataURL(item);
                });
            }
            if (isHtml) {
                let item = await clipboardItem.getType('text/html');
                result.html = await item.text();
            }
            if (isText) {
                let item = await clipboardItem.getType('text/plain');
                let text = await item.text();
                result.text = text;
            }
        }
        return result;
    }

}
