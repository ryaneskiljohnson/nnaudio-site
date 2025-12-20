import { decodeBase64 } from "jsr:@std/encoding/base64";

const base_wc_url = "https://nnaud.io/wp-json/wc/v3/";

function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

async function validateToken(token: string): Promise<boolean> {
  try {
    if (token == "") return false;

    const url = new URL("https://nnaud.io/wp-json/jwt-auth/v1/token/validate");
    const result = await (
      await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      })
    ).json();
    return result.code == "jwt_auth_valid_token";
  } catch (error) {
    console.log(error);
    return false;
  }
}

function extract_user_id(token: string): string | null {
  try {
    const split = token.split(".");
    let user_part = split[1];
    while (user_part.length % 4 != 0) user_part += "=";
    const decoded = new TextDecoder().decode(decodeBase64(user_part));
    const json_res = JSON.parse(decoded);
    const user_id = json_res.data.user.id;

    return user_id;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function handleFetchProducts(req: Request): Promise<Response> {
  try {
    const body = await req.formData();
    const token: string = body.get("token")?.toString() || "";
    const is_valid = await validateToken(token);

    if (!is_valid)
      return new Response(formatError("Token is invalid"), { status: 400 });

    const user_id = extract_user_id(token);
    if (user_id == null)
      return new Response(formatError("Token is invalid"), { status: 400 });

    console.log("fetching downloads for user " + user_id);

    const wc_url = new URL(base_wc_url + "customers/" + user_id + "/downloads");
    wc_url.searchParams.append(
      "consumer_key",
      Deno.env.get("CONSUMER_KEY") || ""
    );
    wc_url.searchParams.append(
      "consumer_secret",
      Deno.env.get("CONSUMER_SECRET") || ""
    );

    return await fetch(wc_url);
  } catch (error) {
    console.log(error);
    return new Response(formatError("Unable to handle products request"));
  }
}

async function handleFetchProduct(req: Request): Promise<Response> {
  try {
    const body = await req.formData();
    const token: string = body.get("token")?.toString() || "";
    const product_id: string = body.get("product_id")?.toString() || "";
    const is_valid = await validateToken(token);

    if (!is_valid)
      return new Response(formatError("Token is invalid"), { status: 400 });

    console.log("fetching product " + product_id);

    const wc_url = new URL(base_wc_url + "products/" + product_id);
    wc_url.searchParams.append(
      "consumer_key",
      Deno.env.get("CONSUMER_KEY") || ""
    );
    wc_url.searchParams.append(
      "consumer_secret",
      Deno.env.get("CONSUMER_SECRET") || ""
    );

    return await fetch(wc_url);
  } catch (error) {
    console.log(error);
    return new Response(formatError("Unable to handle product request"));
  }
}

async function handleRedeemSerial(req: Request): Promise<Response> {
  try {
    const body = await req.formData();
    const token: string = body.get("token")?.toString() || "";
    const serial_key: string = body.get("serial")?.toString() || "";
    const is_valid = await validateToken(token);

    if (!is_valid)
      return new Response(formatError("Token is invalid"), { status: 400 });

    const user_id = extract_user_id(token);
    if (user_id == null)
      return new Response(formatError("Token is invalid"), { status: 400 });

    console.log("redeeming serial " + serial_key);

    const redeem_url = new URL(
      "https://nnaud.io/wp-json/nnaudio/v1/validate-serial"
    );
    redeem_url.searchParams.append(
      "consumer_key",
      Deno.env.get("CONSUMER_KEY") || ""
    );
    redeem_url.searchParams.append(
      "consumer_secret",
      Deno.env.get("CONSUMER_SECRET") || ""
    );

    return await fetch(redeem_url, {
      method: "POST",
      body: JSON.stringify({ serial_key, user_id }),
    });
  } catch (error) {
    console.log(error);
    return new Response(formatError("Unable to handle serial key request"));
  }
}

async function handleLoginReq(req: Request): Promise<Response> {
  const auth_url = new URL("https://nnaud.io/wp-json/jwt-auth/v1/token");

  try {
    const req_body = await req.formData();
    const form = new FormData();
    const username = req_body.get("username")?.toString() || "";
    console.log("logging in " + username);
    form.append("username", username);
    form.append("password", req_body.get("password")?.toString() || "");
    return await fetch(auth_url, { method: "POST", body: form });
  } catch (error) {
    console.log(error);
    return new Response(formatError("Unable to login"));
  }
}

Deno.serve({ port: 4242 }, async (req) => {
  const products_route = new URLPattern({ pathname: "/products" });
  const product_route = new URLPattern({ pathname: "/product" });
  const redeem_route = new URLPattern({ pathname: "/redeem" });
  const login_route = new URLPattern({ pathname: "/login" });

  if (products_route.exec(req.url)) return await handleFetchProducts(req);
  else if (product_route.exec(req.url)) return await handleFetchProduct(req);
  else if (login_route.exec(req.url)) return await handleLoginReq(req);
  else if (redeem_route.exec(req.url)) return await handleRedeemSerial(req);

  return new Response(formatError("Not found"), { status: 404 });
});
