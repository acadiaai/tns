/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_PhaseResponse } from '../models/api_PhaseResponse';
import type { api_PhaseTransitionRequest } from '../models/api_PhaseTransitionRequest';
import type { api_UpdatePhaseRequest } from '../models/api_UpdatePhaseRequest';
import type { repository_Phase } from '../models/repository_Phase';
import type { repository_PhaseData } from '../models/repository_PhaseData';
import type { repository_Tool } from '../models/repository_Tool';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class PhasesService {

    /**
     * Get all phase data fields
     * Get all data fields configured across all phases
     * @returns repository_PhaseData OK
     * @throws ApiError
     */
    public static getApiPhaseData(): CancelablePromise<Array<repository_PhaseData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phase-data',
        });
    }

    /**
     * Get phase data fields
     * Get all data fields configured for a specific phase
     * @param phaseId Phase ID
     * @returns repository_PhaseData OK
     * @throws ApiError
     */
    public static getApiPhaseData1(
        phaseId: string,
    ): CancelablePromise<Array<repository_PhaseData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phase-data/{phaseId}',
            path: {
                'phaseId': phaseId,
            },
        });
    }

    /**
     * Get all phases
     * Retrieve all workflow phases with their metadata
     * @returns api_PhaseResponse OK
     * @throws ApiError
     */
    public static getApiPhases(): CancelablePromise<Array<api_PhaseResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases',
        });
    }

    /**
     * Check auto-advance
     * Check if a session should auto-advance to next phase
     * @param sessionId Session ID
     * @returns any OK
     * @throws ApiError
     */
    public static getApiPhasesAutoAdvance(
        sessionId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases/auto-advance/{session_id}',
            path: {
                'session_id': sessionId,
            },
        });
    }

    /**
     * Transition to a new phase
     * Request a phase transition for a session
     * @param request Transition request
     * @returns any OK
     * @throws ApiError
     */
    public static postApiPhasesTransition(
        request: api_PhaseTransitionRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/phases/transition',
            body: request,
        });
    }

    /**
     * Get phase by ID
     * Retrieve a specific phase with its metadata
     * @param id Phase ID
     * @returns api_PhaseResponse OK
     * @throws ApiError
     */
    public static getApiPhases1(
        id: string,
    ): CancelablePromise<api_PhaseResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases/{id}',
            path: {
                'id': id,
            },
        });
    }

    /**
     * Update phase configuration
     * Update phase display name, description, colors, icons, and timing requirements
     * @param id Phase ID
     * @param phase Phase update request
     * @returns repository_Phase OK
     * @throws ApiError
     */
    public static putApiPhases(
        id: string,
        phase: api_UpdatePhaseRequest,
    ): CancelablePromise<repository_Phase> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/phases/{id}',
            path: {
                'id': id,
            },
            body: phase,
        });
    }

    /**
     * Get phase requirements
     * Retrieve structured data requirements for a specific phase
     * @param id Phase ID
     * @returns repository_PhaseData OK
     * @throws ApiError
     */
    public static getApiPhasesRequirements(
        id: string,
    ): CancelablePromise<Array<repository_PhaseData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases/{id}/requirements',
            path: {
                'id': id,
            },
        });
    }

    /**
     * Get phase tools
     * Retrieve MCP tools available for a specific phase
     * @param id Phase ID
     * @returns repository_Tool OK
     * @throws ApiError
     */
    public static getApiPhasesTools(
        id: string,
    ): CancelablePromise<Array<repository_Tool>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases/{id}/tools',
            path: {
                'id': id,
            },
        });
    }

}
