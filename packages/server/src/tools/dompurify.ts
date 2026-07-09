import { JSDOM } from "jsdom";
import dompurify from "dompurify";

interface ServerSideDomPurify {
    sanitize: (unsafeHtmlInput: string) => string;
}

const serverSideDomPurify = () => {
    const { window } = new JSDOM("<!DOCTYPE html>");
    // @ts-expect-error this is fine
    return dompurify(window) as ServerSideDomPurify;
};

export default serverSideDomPurify();
