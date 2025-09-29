/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_UpdatePromptRequest } from '../models/api_UpdatePromptRequest';
import type { api_UpdateSystemPromptRequest } from '../models/api_UpdateSystemPromptRequest';
import type { repository_Prompt } from '../models/repository_Prompt';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class PromptsService {

    /**
     * Create prompt
     * Create a new prompt for a phase
     * @param prompt Prompt content
     * @returns repository_Prompt Created
     * @throws ApiError
     */
    public static postApiPrompts(
        prompt: api_UpdatePromptRequest,
    ): CancelablePromise<repository_Prompt> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/prompts',
            body: prompt,
        });
    }

    /**
     * Get prompt version history
     * Get all versions of prompts for a specific phase
     * @param phaseId Phase ID
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static getApiPromptsHistory(
        phaseId: string,
    ): CancelablePromise<Array<repository_Prompt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/prompts/history/{phaseId}',
            path: {
                'phaseId': phaseId,
            },
        });
    }

    /**
     * Update prompt
     * Create a new version of an existing prompt
     * @param id Prompt ID
     * @param prompt Prompt content
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static putApiPrompts(
        id: string,
        prompt: api_UpdatePromptRequest,
    ): CancelablePromise<repository_Prompt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/prompts/{id}',
            path: {
                'id': id,
            },
            body: prompt,
        });
    }

    /**
     * Revert prompt version
     * Revert a prompt to a previous version
     * @param id Prompt ID
     * @param versionId Version ID
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static putApiPromptsRevert(
        id: string,
        versionId: string,
    ): CancelablePromise<repository_Prompt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/prompts/{id}/revert/{versionId}',
            path: {
                'id': id,
                'versionId': versionId,
            },
        });
    }

    /**
     * Get system prompt
     * Retrieve the current system prompt configuration
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static getApiSystemPrompt(): CancelablePromise<repository_Prompt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/system-prompt',
        });
    }

    /**
     * Update system prompt
     * Update the system prompt configuration
     * @param request Update request
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static putApiSystemPrompt(
        request: api_UpdateSystemPromptRequest,
    ): CancelablePromise<repository_Prompt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/system-prompt',
            body: request,
        });
    }

    /**
     * Get all active prompts
     * Get all currently active prompts for all phases
     * @returns repository_Prompt OK
     * @throws ApiError
     */
    public static getApiWorkflowPrompts(): CancelablePromise<Array<repository_Prompt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/workflow/prompts',
        });
    }

}
