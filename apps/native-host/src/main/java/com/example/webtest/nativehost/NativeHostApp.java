package com.example.webtest.nativehost;

import com.example.webtest.json.Jsons;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

public final class NativeHostApp {
    private NativeHostApp() {
    }

    public static void main(String[] args) throws IOException {
        LaunchOptions options = parseArguments(args);
        if (options.helpRequested()) {
            System.out.println("Usage: native-host [chrome-extension://<id>/] [--parent-window=<handle>] [--api-base-url http://127.0.0.1:8787]");
            return;
        }

        NativeHostMessageProcessor processor = new NativeHostMessageProcessor(new LocalAdminApiBridge(options.apiBaseUri()));
        run(System.in, System.out, processor);
    }

    static LaunchOptions parseArguments(String[] args) {
        URI apiBaseUri = URI.create("http://127.0.0.1:8787");
        String callerOrigin = null;
        String parentWindow = null;
        boolean helpRequested = false;
        for (int index = 0; index < args.length; index++) {
            String arg = args[index];
            if ("--api-base-url".equals(arg)) {
                if (index + 1 >= args.length) {
                    throw new IllegalArgumentException("Missing value for --api-base-url.");
                }
                apiBaseUri = URI.create(args[++index]);
            } else if (arg.startsWith("--api-base-url=")) {
                apiBaseUri = URI.create(arg.substring("--api-base-url=".length()));
            } else if ("--help".equals(arg) || "-h".equals(arg)) {
                helpRequested = true;
            } else if (arg.startsWith("--parent-window=")) {
                parentWindow = arg.substring("--parent-window=".length());
            } else if ("--parent-window".equals(arg)) {
                if (index + 1 >= args.length) {
                    throw new IllegalArgumentException("Missing value for --parent-window.");
                }
                parentWindow = args[++index];
            } else if (!arg.startsWith("--") && callerOrigin == null) {
                callerOrigin = arg;
            } else {
                throw new IllegalArgumentException("Unknown option: " + arg);
            }
        }
        return new LaunchOptions(apiBaseUri, callerOrigin, parentWindow, helpRequested);
    }

    static void run(InputStream inputStream, OutputStream outputStream, NativeHostMessageProcessor processor) throws IOException {
        while (true) {
            byte[] payloadBytes = readMessage(inputStream);
            if (payloadBytes == null) {
                return;
            }
            NativeHostResponse response;
            try {
                NativeHostRequest request = Jsons.readValue(new String(payloadBytes, StandardCharsets.UTF_8), NativeHostRequest.class);
                response = processor.process(request);
            } catch (RuntimeException exception) {
                response = NativeHostResponse.failure(null, "INVALID_REQUEST", "Failed to parse native host request.");
            }
            writeMessage(outputStream, Jsons.writeValueAsString(response).getBytes(StandardCharsets.UTF_8));
        }
    }

    private static byte[] readMessage(InputStream inputStream) throws IOException {
        byte[] header = inputStream.readNBytes(4);
        if (header.length == 0) {
            return null;
        }
        if (header.length < 4) {
            throw new EOFException("Incomplete native host message header.");
        }
        int length = ByteBuffer.wrap(header).order(ByteOrder.nativeOrder()).getInt();
        if (length < 0) {
            throw new IOException("Invalid native host message length: " + length);
        }
        byte[] payload = inputStream.readNBytes(length);
        if (payload.length < length) {
            throw new EOFException("Incomplete native host message payload.");
        }
        return payload;
    }

    static void writeMessage(OutputStream outputStream, byte[] payload) throws IOException {
        byte[] header = ByteBuffer.allocate(4)
                .order(ByteOrder.nativeOrder())
                .putInt(payload.length)
                .array();
        outputStream.write(header);
        outputStream.write(payload);
        outputStream.flush();
    }

    record LaunchOptions(URI apiBaseUri, String callerOrigin, String parentWindow, boolean helpRequested) {
    }
}
