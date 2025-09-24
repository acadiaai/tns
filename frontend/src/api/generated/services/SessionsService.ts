/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

}
