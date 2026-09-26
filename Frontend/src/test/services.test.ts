import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { applicationApi, companyApi, jobApi, profileApi, type JobWrite } from '../api/services';
import type { Application, ApplicationDetail, Company, Cv, Profile } from '../types/api';
import { envelope, job, page } from './fixtures';
import { server } from './server';

const profile: Profile = {id:'10000000-0000-4000-8000-000000000001',userId:'10000000-0000-4000-8000-000000000002',fullName:'Lan Nguyen',phone:null,headline:'Engineer',summary:null,locationId:null,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',version:0};
const cv: Cv = {id:'10000000-0000-4000-8000-000000000003',fileName:'cv.pdf',contentType:'application/pdf',sizeBytes:100,isDefault:true,createdAt:'2026-01-01T00:00:00Z'};
const company: Company = {id:'10000000-0000-4000-8000-000000000004',name:'Acme',description:null,address:null,status:'ACTIVE',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',version:0};
const application: Application = {id:'10000000-0000-4000-8000-000000000005',jobId:job.id,candidateId:profile.userId,companyId:company.id,cvId:cv.id,cvFileName:cv.fileName,jobTitle:job.title,candidateIdentity:'candidate@example.com',coverLetter:null,status:'APPLIED',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',version:0};

describe('API service contracts through Gateway base URL', () => {
  it('updates Candidate profile with the backend DTO', async () => {
    server.use(http.put('http://localhost:8080/api/v1/candidates/me', async ({request}) => {expect(await request.json()).toMatchObject({fullName:'Lan Nguyen'});return HttpResponse.json(envelope(profile));}));
    await expect(profileApi.update({fullName:'Lan Nguyen'})).resolves.toEqual(profile);
  });
  it('uploads multipart CV and deletes it', async () => {
    let deleted=false;
    server.use(http.post('http://localhost:8080/api/v1/candidates/me/cvs', () => HttpResponse.json(envelope(cv))),http.delete(`http://localhost:8080/api/v1/candidates/me/cvs/${cv.id}`,()=>{deleted=true;return new HttpResponse(null,{status:204})}));
    await profileApi.upload(new File(['%PDF'],'cv.pdf',{type:'application/pdf'}),true);await profileApi.deleteCv(cv.id);expect(deleted).toBe(true);
  });
  it('creates Company and adds only RECRUITER membership', async () => {
    server.use(http.post('http://localhost:8080/api/v1/companies',()=>HttpResponse.json(envelope(company))),http.post(`http://localhost:8080/api/v1/companies/${company.id}/members`,async({request})=>{expect(await request.json()).toEqual({userId:profile.userId,role:'RECRUITER'});return HttpResponse.json(envelope(null))}));
    await expect(companyApi.create({name:'Acme'})).resolves.toEqual(company);await companyApi.addMember(company.id,profile.userId);
  });
  it('creates and transitions a Job with version', async () => {
    const body:JobWrite={companyId:company.id,title:job.title,description:job.description,requirements:job.requirements,locationId:job.location.id,categoryId:job.category.id,employmentType:'FULL_TIME',salaryMin:2000,salaryMax:3500,salaryCurrency:'USD',salaryNegotiable:false,applicationDeadline:'2099-12-31',version:null};
    server.use(http.post('http://localhost:8080/api/v1/jobs',()=>HttpResponse.json(envelope({...job,status:'DRAFT'}))),http.patch(`http://localhost:8080/api/v1/jobs/${job.id}/status`,async({request})=>{expect(await request.json()).toEqual({status:'PUBLISHED',version:0});return HttpResponse.json(envelope(job))}));
    await jobApi.create(body);await expect(jobApi.status(job.id,'PUBLISHED',0)).resolves.toEqual(job);
  });
  it('drops unsupported Job filters before making the request', async () => {
    server.use(http.get('http://localhost:8080/api/v1/jobs',({request})=>{const query=new URL(request.url).searchParams;expect(query.has('employmentType')).toBe(false);expect(query.has('salaryMin')).toBe(false);return HttpResponse.json(envelope(page([job])))}));
    await jobApi.search({employmentType:'REMOTE' as never,salaryMin:-1});
  });
  it('applies, lists, and changes Application status using backend shapes', async () => {
    const detail:ApplicationDetail={application:{...application,status:'SCREENING',version:1},history:[]};
    server.use(http.post('http://localhost:8080/api/v1/applications',async({request})=>{expect(await request.json()).toEqual({jobId:job.id,cvId:cv.id,coverLetter:'Hello'});return HttpResponse.json(envelope(application))}),http.get('http://localhost:8080/api/v1/applications/me',()=>HttpResponse.json(envelope(page([application])))),http.patch(`http://localhost:8080/api/v1/applications/${application.id}/status`,async({request})=>{expect(await request.json()).toEqual({newStatus:'SCREENING',note:'Review',version:0});return HttpResponse.json(envelope(detail))}));
    await applicationApi.apply(job.id,cv.id,'Hello');await expect(applicationApi.mine()).resolves.toMatchObject({content:[application]});await expect(applicationApi.status(application.id,'SCREENING','Review',0)).resolves.toEqual(detail);
  });
});
