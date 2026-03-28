/**
 * No demo users or fake inventory — register the owner first at /register/owner,
 * then add field staff, retail stores, and catalogue lines from the app.
 */
async function main() {
  console.log("Seed skipped. Use /register/owner to create the first account.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
