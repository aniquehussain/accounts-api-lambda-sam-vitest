import { test, expect } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { lambdaHandler } from "./app"
import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";

// create mock client
const client = mockClient(DynamoDBDocumentClient);

// Mock the GetCommand function
client.on(GetCommand).callsFake(() => {
  // emulate the real response, does not require promises usage
  return { Item: { key: "object-key" } };
});

test("POST request - successful", async () => {
  const userId = "someUserId";
  const expectedBalance = 100;

  // Mock getUser function
  client.on(GetCommand).callsFake(() => {
    return { Item: { userId, balance: expectedBalance } };
  });

  const event = {
    httpMethod: "POST",
    body: JSON.stringify({ userId }),
  };

  const response = await lambdaHandler(event as APIGatewayProxyEvent);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual(JSON.stringify({
    message: "User balance retrieved successfully",
    balance: expectedBalance,
  }));
});

test("PATCH request - successful", async () => {
  // Mock transact function
  client.on(PutCommand).callsFake(() => {});

  const event = {
    httpMethod: "POST",
    body: JSON.stringify({
      userId: "someUserId",
      amount: 50,
      type: "debit",
      requestType: "someRequestType",
    }),
  };

  const response = await lambdaHandler(event as APIGatewayProxyEvent);

  expect(response.statusCode).toBe(200);
  expect(response.body).toContain("Transaction successful");
});

test("Error case - invalid request", async () => {
  const event = {
    httpMethod: "INVALID_METHOD",
    body: JSON.stringify({}),
  };

  const response = await lambdaHandler(event as APIGatewayProxyEvent);

  expect(response.statusCode).toBe(400);
  expect(response.body).toContain("Invalid request");
});

