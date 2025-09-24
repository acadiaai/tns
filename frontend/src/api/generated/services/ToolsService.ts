/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { repository_Tool } from '../models/repository_Tool';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ToolsService {

    /**
     * Get all tools
     * Retrieve all MCP tools available in the system
     * @returns repository_Tool OK
     * @throws ApiError
     */
    public static getApiTools(): CancelablePromise<Array<repository_Tool>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tools',
        });
    }

}
