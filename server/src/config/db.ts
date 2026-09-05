import mongoose from "mongoose";

// Opening a connection to MongoDB takes time, so the driver opens a handful and
// reuses them (this set is called a connection pool). That is why we connect
// once at startup rather than on every request.

// The caller passes the connection string in. Keeping the settings out of this
// file means a test can point it at a throwaway database in one line.
export async function connectDb(uri: string): Promise<void> {
  // Without this, a query sent while the connection is down waits 10 seconds
  // before failing. 5 seconds keeps a broken database from holding requests open.
  mongoose.set("bufferTimeoutMS", 5000);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`connected to MongoDB (${describeTarget(uri)})`);
  } catch (error) {
    console.error(
      `\nCannot start: could not reach MongoDB at ${describeTarget(uri)}`,
    );
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

// mongoose.connection.readyState is a number: 0 disconnected, 1 connected,
// 2 connecting, 3 disconnecting. The health route only cares about 1.
export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// The connection string holds a password, so it must never reach a log.
// This prints only the host and database name.
function describeTarget(uri: string): string {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "") || "(default)";
    return `${parsed.host}/${dbName}`;
  } catch {
    return "(unparseable connection string)";
  }
}
