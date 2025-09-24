/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AIGuidance } from '../models/AIGuidance';
import type { Client } from '../models/Client';
import type { CreateAIGuidanceRequest } from '../models/CreateAIGuidanceRequest';
import type { CreateClientRequest } from '../models/CreateClientRequest';
import type { CreateSessionRequest } from '../models/CreateSessionRequest';
import type { CreateTherapistRequest } from '../models/CreateTherapistRequest';
import type { HealthResponse } from '../models/HealthResponse';
import type { Session } from '../models/Session';
import type { SessionProgress } from '../models/SessionProgress';
import type { Stage } from '../models/Stage';
import type { Therapist } from '../models/Therapist';
import type { UpdateSessionProgressRequest } from '../models/UpdateSessionProgressRequest';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DefaultService {

    /**
     * Health check
     * @returns HealthResponse Service is healthy
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<HealthResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }

    /**
     * Get all therapists
     * @returns Therapist List of therapists
     * @throws ApiError
     */
    public static getTherapists(): CancelablePromise<Array<Therapist>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/therapists',
        });
    }

    /**
     * Create a new therapist
     * @param requestBody
     * @returns Therapist Therapist created
     * @throws ApiError
     */
    public static createTherapist(
        requestBody: CreateTherapistRequest,
    ): CancelablePromise<Therapist> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/therapists',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Get all clients
     * @returns Client List of clients
     * @throws ApiError
     */
    public static getClients(): CancelablePromise<Array<Client>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/clients',
        });
    }

    /**
     * Create a new client
     * @param requestBody
     * @returns Client Client created
     * @throws ApiError
     */
    public static createClient(
        requestBody: CreateClientRequest,
    ): CancelablePromise<Client> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/clients',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Get all therapeutic stages
     * @returns Stage List of stages
     * @throws ApiError
     */
    public static getStages(): CancelablePromise<Array<Stage>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/stages',
        });
    }

    /**
     * Get all sessions
     * @returns Session List of sessions
     * @throws ApiError
     */
    public static getSessions(): CancelablePromise<Array<Session>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sessions',
        });
    }

    /**
     * Create a new session
     * @param requestBody
     * @returns Session Session created
     * @throws ApiError
     */
    public static createSession(
        requestBody: CreateSessionRequest,
    ): CancelablePromise<Session> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sessions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Get session details
     * @param sessionId
     * @returns Session Session details
     * @throws ApiError
     */
    public static getSessionById(
        sessionId: string,
    ): CancelablePromise<Session> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sessions/{sessionId}',
            path: {
                'sessionId': sessionId,
            },
        });
    }

    /**
     * Update session progress
     * @param sessionId
     * @param stageId
     * @param requestBody
     * @returns SessionProgress Progress updated
     * @throws ApiError
     */
    public static updateSessionProgress(
        sessionId: string,
        stageId: number,
        requestBody: UpdateSessionProgressRequest,
    ): CancelablePromise<SessionProgress> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sessions/{sessionId}/progress/{stageId}',
            path: {
                'sessionId': sessionId,
                'stageId': stageId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Get AI guidance for session
     * @param sessionId
     * @returns AIGuidance AI guidance list
     * @throws ApiError
     */
    public static getAiGuidance(
        sessionId: string,
    ): CancelablePromise<Array<AIGuidance>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sessions/{sessionId}/guidance',
            path: {
                'sessionId': sessionId,
            },
        });
    }

    /**
     * Create AI guidance
     * @param requestBody
     * @returns AIGuidance AI guidance created
     * @throws ApiError
     */
    public static createAiGuidance(
        requestBody: CreateAIGuidanceRequest,
    ): CancelablePromise<AIGuidance> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/ai/guidance',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

}
