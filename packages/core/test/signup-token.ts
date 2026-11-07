import { assert } from "chai";
import { suite, test } from "mocha";
import { Auth, AuthPurpose, AuthRequest, AuthRequestStatus } from "../src/auth";
import { RequestLogEntry, RequestLogger, RequestLoggerConfig, VoidLogger } from "../src/logging";
import { Controller } from "../src/server";
import { MemoryStorage } from "../src/storage";
import { Request } from "../src/transport";

suite("Signup token validation", () => {
    test("checks a verified signup token without consuming it", async () => {
        const storage = new MemoryStorage();
        const auth = new Auth("person@example.com");
        await auth.init();
        const request = new AuthRequest({ purpose: AuthPurpose.Signup, status: AuthRequestStatus.Verified });
        await request.init();
        auth.authRequests.push(request);
        await storage.save(auth);
        const controller = new Controller({ storage, logger: new VoidLogger() } as any, { id: "test" });
        const check = () => (controller as any).checkSignupToken({ email: auth.email, authToken: request.token });
        assert.deepEqual(await check(), { valid: true });
        assert.deepEqual(await check(), { valid: true });
        assert.lengthOf((await storage.get(Auth, auth.id)).authRequests, 1);
    });

    test("rejects expired, wrong, unverified, and non-signup tokens", async () => {
        const storage = new MemoryStorage();
        const auth = new Auth("person@example.com");
        await auth.init();
        const request = new AuthRequest({ purpose: AuthPurpose.Signup, status: AuthRequestStatus.Verified });
        await request.init();
        auth.authRequests.push(request);
        const controller = new Controller({ storage, logger: new VoidLogger() } as any, { id: "test" });
        const check = (email = auth.email, authToken = request.token) =>
            (controller as any).checkSignupToken({ email, authToken });
        await storage.save(auth);
        assert.deepEqual(await check(auth.email, "wrong"), { valid: false });
        assert.deepEqual(await check("other@example.com"), { valid: false });
        request.created = new Date(Date.now() - 3600001);
        await storage.save(auth);
        assert.deepEqual(await check(), { valid: false });
        request.created = new Date();
        request.status = AuthRequestStatus.Started;
        await storage.save(auth);
        assert.deepEqual(await check(), { valid: false });
        request.status = AuthRequestStatus.Verified;
        request.purpose = AuthPurpose.Login;
        await storage.save(auth);
        assert.deepEqual(await check(), { valid: false });
        auth.authRequests = [];
        await storage.save(auth);
        assert.deepEqual(await check(), { valid: false });
    });

    test("does not store token validation requests even when request logging is enabled", async () => {
        const storage = new MemoryStorage();
        const config = new RequestLoggerConfig();
        config.enabled = true;
        config.excludeEndpoints = [];
        const logger = new RequestLogger(storage, config);
        const request = new Request();
        request.method = "checkSignupToken";
        request.params = [{ email: "person@example.com", authToken: "secret" }];
        await logger.log(request, 1);
        assert.lengthOf(await storage.list(RequestLogEntry), 0);
    });
});
