"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary libraries
var ethers_1 = require("ethers");
var _0g_serving_broker_1 = require("@0glabs/0g-serving-broker");
var dotenv_1 = require("dotenv");
var openai_1 = require("openai");
// Load environment variables from .env file
dotenv_1.default.config();
// 
/**
 * ZGInferenceClient - A client for interacting with 0G Labs AI inference services
 * This class handles wallet management, service discovery, and AI inference requests
 */
var ZGInferenceClient = /** @class */ (function () {
    /**
     * Creates a new ZGInferenceClient instance
     * @param privateKey - Your wallet's private key for authentication
     * @param rpcUrl - The blockchain RPC URL (default: 0G testnet)
     */
    function ZGInferenceClient(privateKey, rpcUrl) {
        if (rpcUrl === void 0) { rpcUrl = "https://evmrpc-testnet.0g.ai"; }
        // State tracking
        this.isInitialized = false;
        // Service configuration
        this.providerAddress = null;
        this.endpoint = null;
        this.model = null;
        // Set up blockchain connection
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
    }
    /**
     * Initialize the client - sets up the connection and prepares for inference
     * This must be called before making any inference requests
     */
    ZGInferenceClient.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        // Skip initialization if already done
                        if (this.isInitialized)
                            return [2 /*return*/];
                        console.log("🚀 Initializing ZG Inference Client...");
                        // Create the broker for managing services and payments
                        _a = this;
                        return [4 /*yield*/, (0, _0g_serving_broker_1.createZGComputeNetworkBroker)(this.wallet)];
                    case 1:
                        // Create the broker for managing services and payments
                        _a.broker = _e.sent();
                        // Show current wallet balance
                        _c = (_b = console).log;
                        _d = ["💰 Wallet balance:"];
                        return [4 /*yield*/, this.provider.getBalance(this.wallet.address)];
                    case 2:
                        // Show current wallet balance
                        _c.apply(_b, _d.concat([_e.sent()]));
                        // Set up account and add funds if needed
                        return [4 /*yield*/, this.manageLedgerFunds()];
                    case 3:
                        // Set up account and add funds if needed
                        _e.sent();
                        // Find and connect to an AI inference service
                        return [4 /*yield*/, this.setupInferenceProvider()];
                    case 4:
                        // Find and connect to an AI inference service
                        _e.sent();
                        this.isInitialized = true;
                        console.log("✅ ZG Inference Client initialized successfully!");
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Manages the ledger account and funds
     * Creates a new account if one doesn't exist, or adds funds if balance is low
     */
    ZGInferenceClient.prototype.manageLedgerFunds = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ledger, amountToSend, depositRes, error_1, amountToSend, addRes, createError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 9]);
                        return [4 /*yield*/, this.broker.ledger.getLedger()];
                    case 1:
                        ledger = _a.sent();
                        console.log("📊 Account exists. Current ledger balance:", ledger);
                        if (!(parseFloat(ledger) < 0.05)) return [3 /*break*/, 3];
                        amountToSend = 0.1;
                        console.log("💵 Adding funds to existing account:", amountToSend);
                        return [4 /*yield*/, this.broker.ledger.depositFund(amountToSend)];
                    case 2:
                        depositRes = _a.sent();
                        console.log("✅ Deposit result:", depositRes);
                        _a.label = 3;
                    case 3: return [3 /*break*/, 9];
                    case 4:
                        error_1 = _a.sent();
                        // Account doesn't exist, so create a new one
                        console.log("🆕 Account doesn't exist, creating new account...");
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        amountToSend = 0.1;
                        return [4 /*yield*/, this.broker.ledger.addLedger(amountToSend)];
                    case 6:
                        addRes = _a.sent();
                        console.log("✅ Account creation result:", addRes);
                        return [3 /*break*/, 8];
                    case 7:
                        createError_1 = _a.sent();
                        console.error("❌ Error creating account:", createError_1);
                        throw createError_1;
                    case 8: return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sets up connection to an AI inference provider
     * Finds available services and configures the client to use one
     */
    ZGInferenceClient.prototype.setupInferenceProvider = function () {
        return __awaiter(this, void 0, void 0, function () {
            var services, _a, endpoint, model;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.broker.inference.listService()];
                    case 1:
                        services = _b.sent();
                        console.log("🔍 Available services:", services);
                        // Make sure at least one service is available
                        if (services.length === 0) {
                            throw new Error("❌ No inference services available");
                        }
                        // Use the first available service
                        this.providerAddress = services[0].provider;
                        return [4 /*yield*/, this.broker.inference.acknowledgeProviderSigner(this.providerAddress)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.broker.inference.getServiceMetadata(this.providerAddress)];
                    case 3:
                        _a = _b.sent(), endpoint = _a.endpoint, model = _a.model;
                        this.endpoint = endpoint;
                        this.model = model;
                        console.log("🌐 Service Endpoint:", this.endpoint);
                        console.log("🤖 Model:", this.model);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Main method to send messages to the AI and get responses
     * @param message - The message/question you want to ask the AI
     * @param tools - Optional tools the AI can use (like weather checking)
     * @param systemPrompt - Optional instructions for how the AI should behave
     * @returns The AI's response
     */
    ZGInferenceClient.prototype.inference = function (message, tools, systemPrompt) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, headers, openai, requestParams, completion, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        messages = [];
                        // Add system instructions if provided
                        if (systemPrompt) {
                            messages.push({ role: "system", content: systemPrompt });
                        }
                        // Add the user's message
                        messages.push({ role: "user", content: message });
                        return [4 /*yield*/, this.broker.inference.getRequestHeaders(this.providerAddress, message)];
                    case 3:
                        headers = _a.sent();
                        console.log(headers);
                        openai = new openai_1.default({
                            baseURL: this.endpoint,
                            apiKey: "", // Not needed for 0G services
                            defaultHeaders: __assign({}, headers),
                        });
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        requestParams = {
                            messages: messages,
                            model: this.model,
                            headers: ""
                        };
                        // Add tools if provided (like weather checking capabilities)
                        if (tools && tools.length > 0) {
                            requestParams.tools = tools;
                            requestParams.tool_choice = "auto"; // Let AI decide when to use tools
                        }
                        return [4 /*yield*/, openai.chat.completions.create(requestParams)];
                    case 5:
                        completion = _a.sent();
                        console.log("OpenAI Response:", completion);
                        // Check if the AI wants to use any tools
                        if (completion.choices[0].message.tool_calls) {
                            return [2 /*return*/, this.handleToolCalls(completion, openai, messages)];
                        }
                        // Return the AI's response
                        return [2 /*return*/, {
                                message: completion.choices[0].message.content,
                                usage: completion.usage,
                                finish_reason: completion.choices[0].finish_reason,
                            }];
                    case 6:
                        error_2 = _a.sent();
                        console.error("❌ Error with inference:", error_2);
                        throw error_2;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handles cases where the AI wants to use tools (like checking weather)
     * This method executes the tools and gets the final response
     */
    ZGInferenceClient.prototype.handleToolCalls = function (completion, openai, messages) {
        return __awaiter(this, void 0, void 0, function () {
            var toolCalls, _i, toolCalls_1, toolCall, functionName, functionArgs, result, originalUserMessage, uniqueMessage, newHeaders, newOpenai, finalCompletion;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        toolCalls = completion.choices[0].message.tool_calls;
                        // Add the AI's request to use tools to the conversation
                        messages.push(completion.choices[0].message);
                        _i = 0, toolCalls_1 = toolCalls;
                        _b.label = 1;
                    case 1:
                        if (!(_i < toolCalls_1.length)) return [3 /*break*/, 4];
                        toolCall = toolCalls_1[_i];
                        functionName = toolCall.function.name;
                        functionArgs = JSON.parse(toolCall.function.arguments);
                        console.log("\uD83D\uDD27 Executing tool: ".concat(functionName), functionArgs);
                        return [4 /*yield*/, this.executeToolFunction(functionName, functionArgs)];
                    case 2:
                        result = _b.sent();
                        // Add the tool results to the conversation
                        messages.push({
                            tool_call_id: toolCall.id,
                            role: "tool",
                            content: JSON.stringify(result),
                        });
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: 
                    // Wait a moment to avoid duplicate requests
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 5:
                        // Wait a moment to avoid duplicate requests
                        _b.sent();
                        originalUserMessage = ((_a = messages.find(function (msg) { return msg.role === "user"; })) === null || _a === void 0 ? void 0 : _a.content) ||
                            "Follow-up request";
                        uniqueMessage = "".concat(originalUserMessage, " [").concat(Date.now(), "]");
                        return [4 /*yield*/, this.broker.inference.getRequestHeaders(this.providerAddress, uniqueMessage)];
                    case 6:
                        newHeaders = _b.sent();
                        newOpenai = new openai_1.default({
                            baseURL: this.endpoint,
                            apiKey: "dummy-key",
                            defaultHeaders: __assign({}, newHeaders),
                        });
                        return [4 /*yield*/, newOpenai.chat.completions.create({
                                messages: messages,
                                model: this.model,
                            })];
                    case 7:
                        finalCompletion = _b.sent();
                        return [2 /*return*/, {
                                message: finalCompletion.choices[0].message.content,
                                usage: finalCompletion.usage,
                                finish_reason: finalCompletion.choices[0].finish_reason,
                                tool_calls: toolCalls,
                            }];
                }
            });
        });
    };
    /**
     * Executes the specific tool functions that the AI requests
     * Currently supports: weather checking
     */
    ZGInferenceClient.prototype.executeToolFunction = function (functionName, args) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Check which tool function to execute
                switch (functionName) {
                    case "get_weather":
                        return [2 /*return*/, this.getWeather(args.location)];
                    default:
                        throw new Error("\u274C Unknown tool function: ".concat(functionName));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Mock weather function - gets weather information for a location
     * In a real application, this would call a weather API
     */
    ZGInferenceClient.prototype.getWeather = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This is a mock implementation - replace with actual weather API in production
                return [2 /*return*/, {
                        location: location,
                        temperature: "25°C",
                        condition: "Sunny",
                        humidity: "60%",
                        timestamp: new Date().toISOString(),
                    }];
            });
        });
    };
    /**
     * Get the current balance in the ledger account
     * @returns The balance as a string
     */
    ZGInferenceClient.prototype.getLedgerBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.broker.ledger.getLedger()];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get the current wallet balance on the blockchain
     * @returns The balance in wei (smallest unit of ETH)
     */
    ZGInferenceClient.prototype.getWalletBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.provider.getBalance(this.wallet.address)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ZGInferenceClient;
}());
// Tool Definition: Weather Tool
// This defines what the AI can do - check weather in any location
var weatherTool = {
    type: "function",
    function: {
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The city and state/country, e.g. San Francisco, CA",
                },
            },
            required: ["location"],
        },
    },
};
/**
 * Main function - demonstrates how to use the ZGInferenceClient
 * This example shows both simple AI chat and AI with weather tool usage
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var client, simpleResponse, weatherResponse, _a, _b, _c, _d, _e, _f, error_3;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("🚀 Starting ZG Inference Client Demo");
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 6, , 7]);
                    client = new ZGInferenceClient(process.env.PRIVATE_KEY);
                    // Example 1: Simple AI conversation without any tools
                    console.log("\n💬 Example 1: Simple AI Conversation");
                    return [4 /*yield*/, client.inference("Tell me a short joke about programming.", undefined, // No tools provided
                        "You are a helpful assistant with a sense of humor.")];
                case 2:
                    simpleResponse = _g.sent();
                    console.log("🤖 AI Response:", simpleResponse.message);
                    // Example 2: AI conversation with weather tool
                    console.log("\n🌤️ Example 2: AI with Weather Tool");
                    return [4 /*yield*/, client.inference("What's the weather like in Lagos, Nigeria?", [weatherTool], // Provide the weather tool
                        "You are a helpful assistant. Use the available tools to provide accurate information.")];
                case 3:
                    weatherResponse = _g.sent();
                    console.log("🤖 AI Response:", weatherResponse.message);
                    // Show final balances to see how much was spent
                    console.log("\n� Final Account Status:");
                    _b = (_a = console).log;
                    _c = ["� Ledger Balance:"];
                    return [4 /*yield*/, client.getLedgerBalance()];
                case 4:
                    _b.apply(_a, _c.concat([_g.sent()]));
                    _e = (_d = console).log;
                    _f = ["💳 Wallet Balance:"];
                    return [4 /*yield*/, client.getWalletBalance()];
                case 5:
                    _e.apply(_d, _f.concat([_g.sent()]));
                    return [3 /*break*/, 7];
                case 6:
                    error_3 = _g.sent();
                    console.error("❌ Error in main function:", error_3);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Start the demo
main().catch(console.error);
