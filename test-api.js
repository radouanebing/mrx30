async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/backups");
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    console.log("Content:", text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
test();
