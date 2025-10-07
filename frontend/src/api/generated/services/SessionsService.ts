/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_SessionPathResponse } from '../models/api_SessionPathResponse';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class SessionsService {

    /**
     * Get last constructed context for session
     * Returns the last constructed context bundle including prompt, token counts, and retrieval metadata
     * @param id Session ID
     * @returns any OK
     * @throws ApiError
     */
    public static getApiSessionsContextLast(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sessions/{id}/context/last',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }

    /**
     * Get session path
     * Returns the complete path of phase visits for a session
     * @param sessionId Session ID
     * @returns api_SessionPathResponse OK
     * @throws ApiError
     */
    public static getApiSessionsPath(
        sessionId: string,
    ): CancelablePromise<api_SessionPathResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sessions/{sessionId}/path',
            path: {
                'sessionId': sessionId,
            },
        });
    }

}
