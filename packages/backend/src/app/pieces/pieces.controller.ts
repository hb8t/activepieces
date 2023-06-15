import { FastifyPluginCallbackTypebox, Type } from '@fastify/type-provider-typebox'
import { ActivepiecesError, ErrorCode, GetPieceRequestParams, GetPieceRequestQuery, GetPieceRequestWithScopeParams, InstallPieceRequest, ListPiecesRequestQuery, PieceOptionRequest } from '@activepieces/shared'
import { engineHelper } from '../helper/engine-helper'
import { system } from '../helper/system/system'
import { SystemProp } from '../helper/system/system-prop'
import { pieceMetadataService } from './piece-metadata-service'
import { PieceMetadata, PieceMetadataSummary } from '@activepieces/pieces-framework'
import { FastifyRequest } from 'fastify'

const statsEnabled = system.get(SystemProp.STATS_ENABLED) ?? false

export const piecesController: FastifyPluginCallbackTypebox = (app, _opts, done) => {

    app.post(
        '/',
        {
            schema: Type.Object({
                body: InstallPieceRequest,
            }),
        },
        async (
            request: FastifyRequest<{
                Body: InstallPieceRequest
            }>,
        ) => {
            const { result } = await engineHelper.extractPieceMetadata({
                pieceName: request.body.pieceName,
                pieceVersion: request.body.pieceVersion,
            })
            return pieceMetadataService.create({
                projectId: request.principal.projectId,
                pieceMetadata: {
                    ...result,
                    name: request.body.pieceName,
                    version: request.body.pieceVersion,
                },
            })
        },
    )

    app.get('/', {
        schema: {
            querystring: ListPiecesRequestQuery,
        },
    }, async (req): Promise<PieceMetadataSummary[]> => {
        const { release } = req.query

        return await pieceMetadataService.list({
            release,
            projectId: req.principal.projectId,
        })
    })

    app.get('/:scope/:name', {
        schema: {
            params: GetPieceRequestWithScopeParams,
            querystring: GetPieceRequestQuery,
        },
    }, async (req): Promise<PieceMetadata> => {
        const { name, scope } = req.params
        const { version } = req.query

        const decodeScope = decodeURIComponent(scope)
        const decodedName = decodeURIComponent(name)
        return await pieceMetadataService.get({
            projectId: req.principal.projectId,
            name: `${decodeScope}/${decodedName}`,
            version,
        })
    })

    app.get('/:name', {
        schema: {
            params: GetPieceRequestParams,
            querystring: GetPieceRequestQuery,
        },
    }, async (req): Promise<PieceMetadata> => {
        const { name } = req.params
        const { version } = req.query

        const decodedName = decodeURIComponent(name)
        return await pieceMetadataService.get({
            projectId: req.principal.projectId,
            name: decodedName,
            version,
        })
    })

    app.post('/options', {
        schema: {
            body: PieceOptionRequest,
        },
    }, async (req) => {
        const { result } = await engineHelper.executeProp({
            pieceName: req.body.pieceName,
            pieceVersion: req.body.pieceVersion,
            propertyName: req.body.propertyName,
            stepName: req.body.stepName,
            input: req.body.input,
            projectId: req.principal.projectId,
        })

        return result
    })

    app.get('/stats', async () => {
        if (!statsEnabled) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    message: 'not found',
                },
            })
        }

        return await pieceMetadataService.stats()
    })

    done()
}
